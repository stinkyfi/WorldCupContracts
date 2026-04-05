const hre = require("hardhat");
require("dotenv").config();
const { defaultWethToken } = require("./chain-defaults");

/**
 * Deploy GroupGame using WETH (or any 18-decimal ERC-20) for entry fees.
 *
 * Env:
 *   TOKEN_ADDRESS — ERC-20 (default: Base mainnet WETH)
 *   ENTRY_FEE_UNITS — optional override in token units (default: "20" => 20 WETH raw)
 *   ENTRY_FEE_DECIMALS — optional (default: 18)
 *
 * Usage:
 *   npx hardhat run scripts/deploy-groupgame-weth.js --network base
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const net = hre.network.name;
  const tokenAddress =
    process.env.TOKEN_ADDRESS?.trim() || defaultWethToken(net);
  if (!tokenAddress) {
    throw new Error(
      `No default WETH/wrapped native for network "${net}". Set TOKEN_ADDRESS or FUJI_WETH_TOKEN / SONIC_DEFAULT_WETH / SONIC_TESTNET_DEFAULT_WETH (see scripts/chain-defaults.js).`,
    );
  }
  const decimals = Number(process.env.ENTRY_FEE_DECIMALS ?? "18");
  const units = process.env.ENTRY_FEE_UNITS ?? "20";
  const entryFee = hre.ethers.parseUnits(units, decimals);

  console.log("Deploying GroupGame (WETH-style fee)");
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
