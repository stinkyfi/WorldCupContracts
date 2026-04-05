/**
 * Export compiled contract ABIs for the Next.js app and for indexers (subgraph / Goldsky / etc.).
 *
 * Prerequisites: `npx hardhat compile`
 *
 * Writes:
 *   - ../web/src/lib/tournamentAbi.json   — GroupGame ABI (array) for Wagmi / viem
 *   - ../web/src/lib/teamsAbi.json        — Teams ABI (array)
 *   - abis/GroupGame.json                 — contractName + sourceName + abi (indexer-friendly)
 *   - abis/Teams.json                     — same
 *
 * Usage:
 *   npm run abi:export
 *   node scripts/export-abis.js
 */

const fs = require("fs");
const path = require("path");

const CONTRACTS_ROOT = path.resolve(__dirname, "..");
const ARTIFACTS = path.join(CONTRACTS_ROOT, "artifacts", "contracts");
const WEB_LIB = path.join(CONTRACTS_ROOT, "..", "web", "src", "lib");
const INDEXER_OUT = path.join(CONTRACTS_ROOT, "abis");

/**
 * @param {string} artifactSubPath e.g. "GroupGame.sol/GroupGame.json"
 */
function readArtifact(artifactSubPath) {
  const full = path.join(ARTIFACTS, artifactSubPath);
  if (!fs.existsSync(full)) {
    throw new Error(
      `Artifact not found: ${full}\nRun: npx hardhat compile`,
    );
  }
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
  console.log("Wrote", path.relative(CONTRACTS_ROOT, filePath));
}

function exportContract({ artifactPath, webFilename, indexerFilename }) {
  const artifact = readArtifact(artifactPath);
  if (!artifact.abi) {
    throw new Error(`Missing abi in ${artifactPath}`);
  }

  // Front-end: plain ABI array (matches existing tournamentAbi / teamsAbi imports)
  writeJson(path.join(WEB_LIB, webFilename), artifact.abi);

  // Indexers: metadata + ABI (no bytecode)
  writeJson(path.join(INDEXER_OUT, indexerFilename), {
    contractName: artifact.contractName,
    sourceName: artifact.sourceName,
    abi: artifact.abi,
  });
}

function main() {
  console.log("Exporting ABIs from", ARTIFACTS);

  exportContract({
    artifactPath: path.join("GroupGame.sol", "GroupGame.json"),
    webFilename: "tournamentAbi.json",
    indexerFilename: "GroupGame.json",
  });

  exportContract({
    artifactPath: path.join("Teams.sol", "Teams.json"),
    webFilename: "teamsAbi.json",
    indexerFilename: "Teams.json",
  });

  console.log("Done.");
}

main();
