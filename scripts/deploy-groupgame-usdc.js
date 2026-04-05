const hre = require("hardhat");
require("dotenv").config();
const { defaultUsdcToken } = require("./chain-defaults");

/**
 * Deploy GroupGame using USDC (or any ERC-20) with a human-readable fee in token decimals.
 *
 * Env:
 *   TOKEN_ADDRESS — ERC-20 (overrides network default)
 *   SONIC_DEFAULT_USDC / SONIC_TESTNET_DEFAULT_USDC — optional defaults for Sonic networks
 *   ENTRY_FEE_UNITS — optional override as decimal string in token units (default: "20")
 *   ENTRY_FEE_DECIMALS — optional (default: 6 for USDC)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-groupgame-usdc.js --network base
 *   npx hardhat run scripts/deploy-groupgame-usdc.js --network baseSepolia
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const net = hre.network.name;
  const tokenAddress =
    process.env.TOKEN_ADDRESS?.trim() || defaultUsdcToken(net);
  if (!tokenAddress) {
    throw new Error(
      `No default USDC for network "${net}". Set TOKEN_ADDRESS or SONIC_DEFAULT_USDC / SONIC_TESTNET_DEFAULT_USDC (see scripts/chain-defaults.js).`,
    );
  }
  const decimals = Number(process.env.ENTRY_FEE_DECIMALS ?? "6");
  const units = process.env.ENTRY_FEE_UNITS ?? "20";
  const entryFee = hre.ethers.parseUnits(units, decimals);

  console.log("Deploying GroupGame (USDC-style fee)");
  console.log("  deployer:", deployer.address);
  console.log("  token:   ", tokenAddress);
  console.log("  fee:     ", units, "tokens =>", entryFee.toString(), "raw units (", decimals, "decimals)");

  const GG = await hre.ethers.getContractFactory("GroupGame");
  const game = await GG.deploy(tokenAddress, entryFee);
  await game.waitForDeployment();

  const addr = await game.getAddress();
  console.log("GroupGame:", addr);
  console.log("token():  ", await game.token());
  console.log("ENTRY_FEE:", (await game.ENTRY_FEE()).toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
