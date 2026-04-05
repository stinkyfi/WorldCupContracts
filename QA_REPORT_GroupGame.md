# QA Report: GroupGame & Teams (Hardhat)

**Last updated:** 2026-04-03  
**Scope:** `contracts/GroupGame.sol`, `contracts/Teams.sol`, `contracts/Structs/Entry.sol`, `contracts/mocks/MockERC20.sol`  
**Automation:** Hardhat + Mocha/Chai (`test/GroupGame.test.js`, `test/Teams.test.js`)  
**Coverage:** `npm run coverage` (solidity-coverage, `viaIR: true` in `hardhat.config.js`)

## Verification snapshot (this review)

| Check | Status |
|-------|--------|
| `GroupGame` vs report (`token`, `ENTRY_FEE`, errors, events, flows) | **Aligned** — generic ERC-20; constructor `(_token, _entryFee)`. |
| `npm test` (contracts/) | **35 passing** — includes `ZeroToken` / `ZeroEntryFee`, 6- and **18-decimal** entry paths, indexer events, `DustToOwner` cases. |
| `npm run coverage` | **100%** statements / branches / functions / lines on instrumented contracts (see table below). |
| `Entry` struct | **12× `bytes4` + `bool`** with packing note in `Structs/Entry.sol`. |

### Coverage (last run: `npx hardhat coverage`)

Generated artifacts: `coverage/` (HTML), `coverage.json` (Istanbul; listed in `.gitignore`). Re-run after contract changes.

| File | % Stmts | % Branch | % Funcs | % Lines |
|------|---------|----------|---------|---------|
| `GroupGame.sol` | 100 | 100 | 100 | 100 |
| `Teams.sol` | 100 | 100 | 100 | 100 |
| `Structs/Entry.sol` | 100 | 100 | 100 | 100 |
| `mocks/MockERC20.sol` | 100 | 100 | 100 | 100 |
| **All (contracts/)** | **100** | **100** | **100** | **100** |

---

## Product model (on-chain vs off-chain)

| Layer | Responsibility |
|-------|----------------|
| **Off-chain** | Compute standings / scores, decide the ordered winner list (and any tie-break rules). This is the **source of truth for who receives prizes**. |
| **On-chain** | Store entries (`enterPool`), optionally mirror official group results (`setFinalResults`) for audit and `getScore`, and **commit** payouts via `distributePrizes(winners)` in the deployment’s ERC-20 (`token`). |

`getScore` is a **per-slot match counter** against `officialResults`; it does **not** gate `distributePrizes`. Keep indexer and app logic aligned: prize winners come from the calldata passed to `distributePrizes`, not from recomputing `getScore` on-chain.

---

## Implementation notes

### `Entry` storage (`Structs/Entry.sol`)

Twelve group picks are stored as separate `bytes4` fields plus `exists`. Inline comment documents **~2 storage slots** (48 bytes + bool packing). Tests read `entries(addr)` and assert `exists` after `enterPool`.

### `distributePrizes` ordering

`prizesDistributed` is set **before** token transfers. With revert-on-failure ERC-20, a failed transfer **reverts the whole transaction**, so state does not stick in a half-paid state.

### Payment token and `ENTRY_FEE`

- **`token`** — `IERC20 immutable`; any standard ERC-20 per deployment.
- **`ENTRY_FEE`** — `uint256 immutable`, fee in that token’s **smallest units** (must match token decimals at deploy time, e.g. `parseUnits("20", 6)` vs `parseUnits("20", 18)`).
- **Constructor:** `constructor(address tokenAddress, uint256 feeAmount)` — reverts **`ZeroToken`** / **`ZeroEntryFee`**. Parameter names follow Slither **mixedCase**; public **`ENTRY_FEE`** uses `// slither-disable-next-line naming-convention` (Solidity convention keeps SCREAMING_SNAKE for this getter).
- **Deploy scripts:** `scripts/deploy-groupgame-usdc.js` (default 6 decimals), `scripts/deploy-groupgame-weth.js` (default 18 decimals), `scripts/deploy-groupgame.js` (generic env). Shared defaults: `scripts/chain-defaults.js` (Base USDC / WETH addresses).

---

## Resolved since prior review

| Topic | Resolution |
|-------|------------|
| **ENTRY_FEE / token** | Immutable `ENTRY_FEE` + `token` set at deploy; any decimals. Tests use **6**-decimal mock by default and explicit **18**-decimal `enterPool` coverage. |
| **`setFinalResults` overwrite** | `if (resultsSet) revert TournamentFinalized();` — results can only be set **once**. |
| **`InvalidRanking` vs winner eligibility** | `distributePrizes` reverts **`WinnerNotInPool`** when an address did not enter. Bracket validation still uses **`InvalidRanking`**. |
| **Duplicate winners** | `distributePrizes` reverts **`DuplicateWinner`** if the same address appears more than once in `_winners`. |
| **`TransferFailed` / boolean checks** | Removed; `transferFrom` / `transfer` rely on ERC20 **revert** behavior (OZ-style). |
| **Indexer-facing logs** | See **Events** below; tested in `GroupGame.test.js` (“emits indexer events…”, `DustToOwner` when `dust > 0`, no `DustToOwner` when `dust == 0`). |
| **`Teams` id 15** | Display string **Türkiye** (Unicode). |

---

## Events (off-chain indexer / subgraph)

Subscribe to these for a complete lifecycle without relying on custom-error decoding:

| Event | When | Notes |
|-------|------|--------|
| **`PoolEntered(address indexed player, uint256 playerIndex)`** | After each successful `enterPool` | `playerIndex` is the index in `players[]` (0-based). |
| **`OfficialResultsSet(bytes32 indexed resultsHash, bytes4[12] officialResults)`** | After `setFinalResults` | `resultsHash` is `keccak256(abi.encode(officialResults))` — use for dedup / filters; full bracket in non-indexed data. |
| **`PrizePayout(address indexed winner, uint256 amount)`** | Each `token` transfer to a winner | One log per winner; easy to sum per address. |
| **`DustToOwner(address indexed to, uint256 amount)`** | When remainder dust is sent | **Omitted** if `dust == 0` (verified in tests). |
| **`PrizesDistributed(uint256 winnerCount, uint256 shareEach, uint256 dustToOwner)`** | End of `distributePrizes` | Summary for the distribution round. |

**Custom errors (indexers):** `InvalidRanking` = bad bracket at entry; `WinnerNotInPool` = winner list included a non-player; `DuplicateWinner` = duplicate address in `_winners`; `ZeroToken` / `ZeroEntryFee` = bad constructor args.

---

## Medium severity (remaining / watch)

### 1. `Teams.sol` unused by `GroupGame`

**Issue:** Team names live in `Teams.sol` only; `GroupGame` encodes ranks as bytes, not team IDs.

**Recommendation:** Document off-chain mapping (rank byte → team id / name) or integrate IDs if the product needs a single on-chain registry.

### 2. `Teams` spelling: Curaçao (id 19)

**Issue:** Contract returns ASCII **`Curacao`**; marketing may prefer **`Curaçao`**.

**Recommendation:** Align with product copy if displayed verbatim from chain.

---

## Low severity / design notes

### 3. Scoring model

`_checkGroup` compares bytes per slot (ranks 1–4 per position). Document for auditors and the app layer. Off-chain scoring may use richer rules; on-chain `getScore` remains a simple audit view.

### 4. Dust to owner

Remainder of `totalPool % _winners.length` goes to `owner()`. Document for users; `DustToOwner` emits for indexers when non-zero.

### 5. Deployment

`constructor(address tokenAddress, uint256 feeAmount)` — explicit token and raw fee. See `scripts/deploy-groupgame.js`, `deploy-groupgame-usdc.js`, `deploy-groupgame-weth.js`, and `scripts/chain-defaults.js` for Base addresses.

### 6. Frontend

Approvals must match **`ENTRY_FEE`** from the deployed contract (read `ENTRY_FEE` + **`token()`**). The app resolves the payment token from the tournament contract when possible. `web/src/lib/tournamentAbi.json` should track compiled `GroupGame` ABI.

---

## Test suite

- **`npm test`** — regression (constructor guards, 6- and 18-decimal `enterPool`, events, `WinnerNotInPool`, `DuplicateWinner`, frozen `setFinalResults`, `DustToOwner` presence/absence).
- **`npm run coverage`** — HTML under `coverage/`; expect **100%** on current `GroupGame` / `Teams` / `Entry` / `MockERC20` with the suite above.

---

## Sign-off checklist

- [x] Split custom error for non-participant winners vs invalid bracket.  
- [x] Enforce unique winner addresses in `_winners`.  
- [x] Emit indexer-friendly events for entry, results, and payouts.  
- [x] Align `Teams` id 15 naming (Türkiye).  
- [x] Assert `DustToOwner` only when `dust > 0` (automation).  
- [x] Coverage recorded (100% on instrumented contracts, last run).  
- [ ] Confirm frontend approvals match deployed `ENTRY_FEE` / `token()` and subgraph schema matches events above.  
- [ ] Optional: align `Teams` “Curacao” string with product spelling.
