# World Cup 2026 — Smart Contracts

Hardhat project for the **GroupGame** prediction pool and supporting contracts. It includes automated tests, Solidity coverage, Slither static analysis in CI, and scripts to export ABIs for the web app and indexers.

---

## Contents

- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Contracts overview](#contracts-overview)
- [Testing](#testing)
- [Coverage reports](#coverage-reports)
- [Slither static analysis](#slither-static-analysis)
- [ABI export (frontend & indexers)](#abi-export-frontend--indexers)
- [Deployment](#deployment)
- [Configuration files](#configuration-files)
- [Continuous integration](#continuous-integration)
- [Further reading](#further-reading)

---

## Repository layout

Typical structure of this package:

| Path | Purpose |
|------|---------|
| `contracts/` | Solidity sources (`GroupGame.sol`, `Teams.sol`, `Structs/`, `mocks/`) |
| `test/` | Hardhat + Mocha/Chai tests (`*.test.js`) |
| `scripts/` | Deploy and utility scripts (`deploy-groupgame*.js`, `export-abis.js`, `chain-defaults.js`) |
| `abis/` | Generated indexer-oriented JSON (`GroupGame.json`, `Teams.json`) — run `npm run abi:export` |
| `artifacts/`, `cache/` | Hardhat build outputs (local; often gitignored) |
| `slither.config.json` | Slither detector and path settings |
| `QA_REPORT_GroupGame.md` | QA sign-off notes for GroupGame / Teams |
| `.github/workflows/` | CI for this repo when **this folder is the Git root** |

If this project lives inside a **monorepo** (e.g. `WorldCup/contracts/`), GitHub Actions workflows at the **repository root** (`.github/workflows/`) may duplicate or replace the ones under `contracts/.github/workflows/`. GitHub only loads workflows from the **root** `.github/workflows/` of the remote repository.

---

## Prerequisites

- **Node.js** 18+ (CI uses 22)
- **npm** (lockfile: `package-lock.json`)
- For **Slither** locally: **Python 3** and `pip install slither-analyzer`

Optional for deployment:

- A funded wallet and RPC URL (e.g. Base mainnet)
- Environment variables (see [Deployment](#deployment))

---

## Quick start

```bash
cd contracts
npm ci
npx hardhat compile
npm test
```

---

## Contracts overview

### `GroupGame.sol`

Core tournament contract:

- **ERC-20 payment**: immutable `token` and `ENTRY_FEE` (fee in the token’s smallest units; any decimals at deploy time).
- **Entry**: `enterPool(bytes4[12])` — 12 groups, ranks 1–4 per group slot; pulls fee via **OpenZeppelin `SafeERC20`**.
- **Results**: owner calls `setFinalResults` once; frozen after that.
- **Scoring**: `getScore` is an on-chain audit view (per-slot match count); prize winners are committed separately.
- **Payouts**: `distributePrizes(address[])` splits the pool among a provided winner list (off-chain scoring is authoritative for who wins).
- **Safety**: `Ownable`, **`ReentrancyGuard`** (`nonReentrant` on entry and payout), checks-effects-interactions + events ordered before external calls where required for tooling.

### `Teams.sol`

Pure helper: `getTeamName(uint8)` for display strings (not wired into `GroupGame` on-chain).

### `Structs/Entry.sol`

`Entry` struct for stored group picks + `exists` flag.

### `mocks/MockERC20.sol`

Mintable ERC-20 for tests (configurable decimals).

Compiler: **Solidity 0.8.28**, optimizer on, `viaIR: true` (see `hardhat.config.js`).

---

## Testing

| Command | Description |
|---------|-------------|
| `npm test` | Runs `hardhat test` — all Mocha tests under `test/` |
| `npx hardhat test` | Same |

Main suites:

- **`test/GroupGame.test.js`** — constructor guards, `enterPool`, `setFinalResults`, `getScore`, `distributePrizes`, events, 6- and 18-decimal fee paths.
- **`test/Teams.test.js`** — team name lookup and bounds.

Tests use a **mock ERC-20** and deterministic `bytes4[12]` bracket helpers.

---

## Coverage reports

Solidity coverage uses **`solidity-coverage`** with `viaIR: true` aligned to `hardhat.config.js`.

```bash
npm run coverage
```

Outputs:

- **`coverage/`** — HTML report (open `coverage/index.html` in a browser).
- **`coverage.json`** — Istanbul-style data for tooling.

Both **`coverage/`** and **`coverage.json`** are listed in **`.gitignore`** — regenerate locally or in CI when you need fresh numbers. Typical expectation: high coverage on project contracts (`GroupGame`, `Teams`, `Entry`, `MockERC20`).

---

## Slither static analysis

[Slither](https://github.com/crytic/slither) is a static analyzer for Solidity. This repo uses **`slither.config.json`** at the **Hardhat project root** (the same directory as `hardhat.config.js`).

### Configuration highlights

| Setting | Purpose |
|---------|---------|
| `filter_paths` / `exclude_dependencies` | Focus analysis on your contracts; reduce noise from `node_modules` |
| `detectors_to_exclude` | `pragma`, `solc-version` (dependency pragma churn), `calls-loop` (batch winner payouts inherently loop over transfers) |

Slither auto-loads `slither.config.json` when you run it from the project directory.

### Run Slither locally

```bash
cd contracts
npm ci
npx hardhat compile
pip install "slither-analyzer>=0.10.0"
slither . --hardhat-ignore-compile --json slither-report.json
```

- **`--hardhat-ignore-compile`** — uses artifacts from the previous `hardhat compile`.
- **`slither-report.json`** — machine-readable report in the current directory.

### CI pipeline (contracts as Git root)

When this **`contracts/`** tree is the **root** of the Git repository, workflows under **`.github/workflows/`** apply:

| Workflow | Trigger | Role |
|----------|---------|------|
| **`slither-contracts.yml`** | Push to `main` (paths: `*.sol`, config, lockfile, workflow) | `npm ci` → `hardhat compile` → Slither → upload **`slither-report.json`** as an artifact |
| **`hardhat-test-pr.yml`** | Pull requests to `main` | `npm ci` → compile → `npm test` |

Steps use **Node 22**, **Python 3.12**, **checkout/setup-node/setup-python v5**, and **`actions/upload-artifact@v4`** for the Slither JSON.

If your remote is a **monorepo** with contracts in a subfolder, add or mirror these workflows under the **repository root** `.github/workflows/` with `working-directory: contracts` and paths such as `contracts/package-lock.json` and `contracts/slither-report.json`.

---

## ABI export (frontend & indexers)

After compilation, export ABIs for consumers:

```bash
npm run abi:export
```

This runs **`hardhat compile`** and **`scripts/export-abis.js`**, which writes:

| Output | Audience |
|--------|----------|
| `../web/src/lib/tournamentAbi.json` | **GroupGame** ABI array (Wagmi / viem) |
| `../web/src/lib/teamsAbi.json` | **Teams** ABI array |
| `abis/GroupGame.json`, `abis/Teams.json` | **Indexers** — includes `contractName`, `sourceName`, and `abi` |

Requires a sibling **`web/`** package for the web paths (as in the WorldCup monorepo layout).

---

## Deployment

Scripts are **examples**; always verify addresses, amounts, and network.

| npm script | Script file | Notes |
|------------|-------------|--------|
| `npm run deploy:groupgame` | `scripts/deploy-groupgame.js` | Generic `TOKEN_ADDRESS`, `ENTRY_FEE` or `ENTRY_FEE_UNITS` / `ENTRY_FEE_DECIMALS` |
| `npm run deploy:groupgame:usdc` | `scripts/deploy-groupgame-usdc.js` | Defaults for USDC-style 6 decimals (Base USDC address in `chain-defaults.js`) |
| `npm run deploy:groupgame:weth` | `scripts/deploy-groupgame-weth.js` | Defaults for 18 decimals / WETH-style |
| `npm run deploy:base` | `scripts/deploy.js` | Legacy / other factory; may require env vars |

Shared addresses: **`scripts/chain-defaults.js`**.

Example (Base), after configuring `.env` and a funded deployer:

```bash
npx hardhat run scripts/deploy-groupgame-usdc.js --network base
```

Network **`base`** is defined in `hardhat.config.js` (`BASE_RPC_URL`, `DEPLOYER_PRIVATE_KEY`).

---

## Configuration files

| File | Role |
|------|------|
| `hardhat.config.js` | Solidity version, optimizer, `viaIR`, networks, coverage |
| `slither.config.json` | Slither paths and excluded detectors |
| `.env` | RPC, keys (never commit secrets; `.env` is gitignored) |
| `.gitignore` | Ignores `node_modules`, `artifacts`, `cache`, `coverage`, `coverage.json`, `.env` |

---

## Continuous integration

- **Tests on PR**: install → compile → `npm test` (see `hardhat-test-pr.yml`).
- **Slither on main**: install → compile → Slither JSON artifact (see `slither-contracts.yml`).

Keep **`package-lock.json`** committed so `npm ci` is reproducible in CI.

---

## Further reading

- **`QA_REPORT_GroupGame.md`** — product model, events for indexers, resolved findings, coverage snapshot notes.
- [Hardhat docs](https://hardhat.org/docs)
- [Slither wiki](https://github.com/crytic/slither/wiki)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

---

## License

SPDX-License-Identifier: MIT (per individual Solidity files).
