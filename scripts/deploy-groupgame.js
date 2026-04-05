const hre = require("hardhat");
require("dotenv").config();
const { BASE_MAINNET_USDC } = require("./chain-defaults");

/**
 * Generic GroupGame deploy: explicit token + raw entry fee, or defaults for Base USDC.
 *
 * Env:
 *   TOKEN_ADDRESS — required unless using defaults below
 *   ENTRY_FEE — raw uint256 string (smallest units), e.g. "20000000" for 20 USDC (6 dp)
 *
 * If ENTRY_FEE is unset, uses ENTRY_FEE_UNITS + ENTRY_FEE_DECIMALS like deploy-groupgame-usdc.js.
 *
 * Usage:
 *   TOKEN_ADDRESS=0x... ENTRY_FEE=20000000 npx hardhat run scripts/deploy-groupgame.js --network base
 *   npx hardhat run scripts/deploy-groupgame.js --network base   # Base USDC, 20 * 10^6
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const tokenAddress =
    process.env.TOKEN_ADDRESS?.trim() || BASE_MAINNET_USDC;

  let entryFee;
  if (process.env.ENTRY_FEE !== undefined && process.env.ENTRY_FEE !== "") {
    entryFee = BigInt(process.env.ENTRY_FEE);
  } else {
    const decimals = Number(process.env.ENTRY_FEE_DECIMALS ?? "6");
    const units = process.env.ENTRY_FEE_UNITS ?? "20";
    entryFee = hre.ethers.parseUnits(units, decimals);
  }

  console.log("Deploying GroupGame");
  console.log("  deployer:", deployer.address);
  console.log("  token:   ", tokenAddress);
  console.log("  ENTRY_FEE (raw):", entryFee.toString());

  const GG = await hre.ethers.getContractFactory("GroupGame");
  const game = await GG.deploy(tokenAddress, entryFee);
  await game.waitForDeployment();

  console.log("GroupGame:", await game.getAddress());
  console.log("token():  ", await game.token());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
