// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Structs/Entry.sol";

/**
 * @title GroupGame
 * @author Solidity Dev
 * @notice A trustless prediction pool for the 48-team 2026 World Cup.
 * @dev Payment token and entry amount are fixed at deployment for any ERC-20 (any decimals).
 */
contract GroupGame is Ownable {
    // --- Errors ---
    error AlreadyEntered();
    error TournamentFinalized();
    error ResultsNotSet();
    error AlreadyDistributed();
    error InvalidRanking();
    error NoWinnersProvided();
    /// @dev Distinct from `InvalidRanking` so indexers and tooling can tell bracket validation from prize eligibility.
    error WinnerNotInPool();
    error DuplicateWinner();
    error ZeroToken();
    error ZeroEntryFee();

    // --- Events (indexer / subgraph friendly) ---
    event PoolEntered(address indexed player, uint256 playerIndex);
    event OfficialResultsSet(bytes32 indexed resultsHash, bytes4[12] officialResults);
    event PrizePayout(address indexed winner, uint256 amount);
    event DustToOwner(address indexed to, uint256 amount);
    event PrizesDistributed(uint256 winnerCount, uint256 shareEach, uint256 dustToOwner);

    // --- State Variables ---
    /// @notice ERC-20 used for entry fees and prize distribution (immutable per deployment).
    IERC20 public immutable token;
    /// @notice Entry fee in this token's smallest units (same decimals as `token`).
    uint256 public immutable ENTRY_FEE;

    mapping(address => Entry) public entries;
    address[] public players;

    // Official results (1 byte per team, 4 teams per group)
    bytes4[12] public officialResults;
    bool public resultsSet;
    bool public prizesDistributed;

    /**
     * @param _token ERC-20 token address (any standard IERC20).
     * @param _entryFee Amount charged per entry, in the token's smallest units (e.g. `20 * 10**6` for 20 USDC with 6 decimals, or `20 * 10**18` for 20 WETH with 18 decimals).
     */
    constructor(address _token, uint256 _entryFee) Ownable(msg.sender) {
        if (_token == address(0)) revert ZeroToken();
        if (_entryFee == 0) revert ZeroEntryFee();
        token = IERC20(_token);
        ENTRY_FEE = _entryFee;
    }

    // --- Core Functions ---

    /**
     * @notice Enter the pool by providing rankings for all 12 groups.
     * @param _userGroups An array of 12 bytes4, each containing ranks 1, 2, 3, 4.
     */
    function enterPool(bytes4[12] calldata _userGroups) external {
        if (entries[msg.sender].exists) revert AlreadyEntered();
        if (resultsSet) revert TournamentFinalized();

        // Validate all groups before moving money
        for (uint256 i = 0; i < 12; i++) {
            if (!isValidGroup(_userGroups[i])) revert InvalidRanking();
        }

        // Pull payment token — requires prior approval for `ENTRY_FEE`.
        token.transferFrom(msg.sender, address(this), ENTRY_FEE);

        // Save Entry
        Entry storage e = entries[msg.sender];
        e.groupA = _userGroups[0]; e.groupB = _userGroups[1];
        e.groupC = _userGroups[2]; e.groupD = _userGroups[3];
        e.groupE = _userGroups[4]; e.groupF = _userGroups[5];
        e.groupG = _userGroups[6]; e.groupH = _userGroups[7];
        e.groupI = _userGroups[8]; e.groupJ = _userGroups[9];
        e.groupK = _userGroups[10]; e.groupL = _userGroups[11];
        e.exists = true;

        uint256 playerIndex = players.length;
        players.push(msg.sender);
        emit PoolEntered(msg.sender, playerIndex);
    }

    /**
    * @notice Admin sets final standings for all 48 teams.
    * @dev Can only be called once to prevent overwriting results after the fact.
    */
    function setFinalResults(bytes4[12] calldata _official) external onlyOwner {
        if (resultsSet) revert TournamentFinalized();
        officialResults = _official;
        resultsSet = true;
        emit OfficialResultsSet(keccak256(abi.encode(_official)), _official);
    }

    /**
     * @notice On-chain score vs `officialResults` (per-slot match count). Optional audit path.
     * @dev Prize winners are chosen off-chain and committed via `distributePrizes`; this view does not gate payouts.
     */
    function getScore(address _user) public view returns (uint256) {
        if (!entries[_user].exists || !resultsSet) return 0;

        Entry storage e = entries[_user];
        uint256 score = 0;

        score += _checkGroup(e.groupA, officialResults[0]);
        score += _checkGroup(e.groupB, officialResults[1]);
        score += _checkGroup(e.groupC, officialResults[2]);
        score += _checkGroup(e.groupD, officialResults[3]);
        score += _checkGroup(e.groupE, officialResults[4]);
        score += _checkGroup(e.groupF, officialResults[5]);
        score += _checkGroup(e.groupG, officialResults[6]);
        score += _checkGroup(e.groupH, officialResults[7]);
        score += _checkGroup(e.groupI, officialResults[8]);
        score += _checkGroup(e.groupJ, officialResults[9]);
        score += _checkGroup(e.groupK, officialResults[10]);
        score += _checkGroup(e.groupL, officialResults[11]);

        return score;
    }

    /**
     * @notice Commits the off-chain–determined winner list and splits the pool evenly in `token`.
     * @dev Requires `setFinalResults` first (`ResultsNotSet`). Emits `PrizePayout` per winner for indexers.
     */
    function distributePrizes(address[] calldata _winners) external onlyOwner {
        if (!resultsSet) revert ResultsNotSet();
        if (prizesDistributed) revert AlreadyDistributed();
        if (_winners.length == 0) revert NoWinnersProvided();

        uint256 n = _winners.length;
        for (uint256 i = 0; i < n; i++) {
            if (!entries[_winners[i]].exists) revert WinnerNotInPool();
            for (uint256 j = i + 1; j < n; j++) {
                if (_winners[i] == _winners[j]) revert DuplicateWinner();
            }
        }

        uint256 totalPool = token.balanceOf(address(this));
        uint256 share = totalPool / n;
        uint256 dust = totalPool % n;

        prizesDistributed = true;

        for (uint256 i = 0; i < n; i++) {
            token.transfer(_winners[i], share);
            emit PrizePayout(_winners[i], share);
        }

        if (dust > 0) {
            address o = owner();
            token.transfer(o, dust);
            emit DustToOwner(o, dust);
        }

        emit PrizesDistributed(n, share, dust);
    }

    // --- Helpers ---

    function _checkGroup(bytes4 _user, bytes4 _official) internal pure returns (uint256) {
        uint256 p = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (_user[i] == _official[i]) p++;
        }
        return p;
    }

    function isValidGroup(bytes4 _group) internal pure returns (bool) {
        uint8 mask = 0;
        for (uint256 i = 0; i < 4; i++) {
            uint8 rank = uint8(_group[i]);
            if (rank < 1 || rank > 4) return false;
            uint8 bit = uint8(1 << rank);
            if ((mask & bit) != 0) return false;
            mask |= bit;
        }
        return mask == 30;
    }

    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }
}
