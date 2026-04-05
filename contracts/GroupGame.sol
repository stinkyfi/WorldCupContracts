// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Structs/Entry.sol";

/**
 * @title GroupGame
 * @author Solidity Dev
 * @notice A trustless prediction pool for the 48-team 2026 World Cup.
 * @dev Payment token and entry amount are fixed at deployment for any ERC-20 (any decimals).
 *      Uses checks-effects-interactions: state and events before external token calls; `nonReentrant` on entry and payout.
 */
contract GroupGame is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

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
    /// @dev Emitted before transfers execute; use `PrizePayout` / `DustToOwner` for per-transfer confirmation.
    event PrizesDistributed(uint256 winnerCount, uint256 shareEach, uint256 dustToOwner);

    // --- State Variables ---
    /// @notice ERC-20 used for entry fees and prize distribution (immutable per deployment).
    IERC20 public immutable token;
    /// @notice Entry fee in this token's smallest units (same decimals as `token`).
    // slither-disable-next-line naming-convention
    uint256 public immutable ENTRY_FEE;

    mapping(address => Entry) public entries;
    address[] public players;

    // Official results (1 byte per team, 4 teams per group)
    bytes4[12] public officialResults;
    bool public resultsSet;
    bool public prizesDistributed;

    /**
     * @param tokenAddress ERC-20 token address (any standard IERC20).
     * @param feeAmount Amount charged per entry, in the token's smallest units (e.g. `20 * 10**6` for 20 USDC with 6 decimals, or `20 * 10**18` for 20 WETH with 18 decimals).
     */
    constructor(address tokenAddress, uint256 feeAmount) Ownable(msg.sender) {
        if (tokenAddress == address(0)) revert ZeroToken();
        if (feeAmount == 0) revert ZeroEntryFee();
        token = IERC20(tokenAddress);
        ENTRY_FEE = feeAmount;
    }

    // --- Core Functions ---

    /**
     * @notice Enter the pool by providing rankings for all 12 groups.
     * @param userGroups An array of 12 bytes4, each containing ranks 1, 2, 3, 4.
     */
    function enterPool(bytes4[12] calldata userGroups) external nonReentrant {
        if (entries[msg.sender].exists) revert AlreadyEntered();
        if (resultsSet) revert TournamentFinalized();

        for (uint256 i = 0; i < 12; i++) {
            if (!isValidGroup(userGroups[i])) revert InvalidRanking();
        }

        Entry storage e = entries[msg.sender];
        e.groupA = userGroups[0]; e.groupB = userGroups[1];
        e.groupC = userGroups[2]; e.groupD = userGroups[3];
        e.groupE = userGroups[4]; e.groupF = userGroups[5];
        e.groupG = userGroups[6]; e.groupH = userGroups[7];
        e.groupI = userGroups[8]; e.groupJ = userGroups[9];
        e.groupK = userGroups[10]; e.groupL = userGroups[11];
        e.exists = true;

        uint256 playerIndex = players.length;
        players.push(msg.sender);

        emit PoolEntered(msg.sender, playerIndex);

        token.safeTransferFrom(msg.sender, address(this), ENTRY_FEE);
    }

    /**
    * @notice Admin sets final standings for all 48 teams.
    * @dev Can only be called once to prevent overwriting results after the fact.
    */
    function setFinalResults(bytes4[12] calldata officialBracket) external onlyOwner {
        if (resultsSet) revert TournamentFinalized();
        officialResults = officialBracket;
        resultsSet = true;
        emit OfficialResultsSet(keccak256(abi.encode(officialBracket)), officialBracket);
    }

    /**
     * @notice On-chain score vs `officialResults` (per-slot match count). Optional audit path.
     * @dev Prize winners are chosen off-chain and committed via `distributePrizes`; this view does not gate payouts.
     */
    function getScore(address player) public view returns (uint256) {
        if (!entries[player].exists || !resultsSet) return 0;

        Entry storage e = entries[player];
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
     * @dev Requires `setFinalResults` first (`ResultsNotSet`). Emits `PrizePayout` before each `safeTransfer`.
     */
    function distributePrizes(address[] calldata winners) external onlyOwner nonReentrant {
        if (!resultsSet) revert ResultsNotSet();
        if (prizesDistributed) revert AlreadyDistributed();
        if (winners.length == 0) revert NoWinnersProvided();

        uint256 n = winners.length;
        for (uint256 i = 0; i < n; i++) {
            if (!entries[winners[i]].exists) revert WinnerNotInPool();
            for (uint256 j = i + 1; j < n; j++) {
                if (winners[i] == winners[j]) revert DuplicateWinner();
            }
        }

        uint256 totalPool = token.balanceOf(address(this));
        uint256 share = totalPool / n;
        uint256 dust = totalPool % n;

        prizesDistributed = true;

        emit PrizesDistributed(n, share, dust);

        for (uint256 i = 0; i < n; i++) {
            emit PrizePayout(winners[i], share);
            token.safeTransfer(winners[i], share);
        }

        if (dust > 0) {
            address o = owner();
            emit DustToOwner(o, dust);
            token.safeTransfer(o, dust);
        }
    }

    // --- Helpers ---

    function _checkGroup(bytes4 userBracket, bytes4 officialBracket) internal pure returns (uint256) {
        uint256 p = 0;
        for (uint256 i = 0; i < 4; i++) {
            if (userBracket[i] == officialBracket[i]) p++;
        }
        return p;
    }

    function isValidGroup(bytes4 groupBytes) internal pure returns (bool) {
        uint8 mask = 0;
        for (uint256 i = 0; i < 4; i++) {
            uint8 rank = uint8(groupBytes[i]);
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
