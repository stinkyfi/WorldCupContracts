/**
 * Well-known token addresses per Hardhat network name.
 * Override with TOKEN_ADDRESS (or WETH deploy: TOKEN_ADDRESS) when in doubt.
 *
 * Verify on explorers before mainnet use.
 */

/** Base mainnet — native USDC */
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Base mainnet — canonical WETH */
const BASE_MAINNET_WETH = "0x4200000000000000000000000000000000000006";

/** Base Sepolia — Circle USDC */
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

/** Base Sepolia — WETH (same canonical predeploy pattern as Base) */
const BASE_SEPOLIA_WETH = "0x4200000000000000000000000000000000000006";

/** Avalanche C-Chain mainnet — native USDC */
const AVALANCHE_MAINNET_USDC = "0xB97EF9Ef8734CdaC01a5e5Ae1656daed3200F9a7";

/** Avalanche C-Chain — WETH.e (bridged WETH) */
const AVALANCHE_MAINNET_WETH = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bBf";

/** Avalanche Fuji testnet — USDC */
const FUJI_USDC = "0x5425890298aed601595a70AB815c967d41aFAD9E";

/**
 * Sonic / Sonic testnet USDC: set `SONIC_DEFAULT_USDC` / `SONIC_TESTNET_DEFAULT_USDC` in `.env`
 * after verifying on Sonic explorers, or pass `TOKEN_ADDRESS` when deploying.
 */
const SONIC_USDC = process.env.SONIC_DEFAULT_USDC?.trim() || "";
const SONIC_TESTNET_USDC = process.env.SONIC_TESTNET_DEFAULT_USDC?.trim() || "";

/** @param {string} network Hardhat network name */
function defaultUsdcToken(network) {
  const map = {
    base: BASE_MAINNET_USDC,
    baseSepolia: BASE_SEPOLIA_USDC,
    avalanche: AVALANCHE_MAINNET_USDC,
    fuji: FUJI_USDC,
    sonic: SONIC_USDC || null,
    sonicTestnet: SONIC_TESTNET_USDC || null,
  };
  return map[network] ?? null;
}

/** @param {string} network Hardhat network name */
function defaultWethToken(network) {
  const map = {
    base: BASE_MAINNET_WETH,
    baseSepolia: BASE_SEPOLIA_WETH,
    avalanche: AVALANCHE_MAINNET_WETH,
    /** Fuji: set `TOKEN_ADDRESS` or `FUJI_WETH_TOKEN` in `.env` */
    fuji: process.env.FUJI_WETH_TOKEN?.trim() || null,
    sonic: process.env.SONIC_DEFAULT_WETH?.trim() || null,
    sonicTestnet: process.env.SONIC_TESTNET_DEFAULT_WETH?.trim() || null,
  };
  return map[network] ?? null;
}

module.exports = {
  BASE_MAINNET_USDC,
  BASE_MAINNET_WETH,
  BASE_SEPOLIA_USDC,
  BASE_SEPOLIA_WETH,
  AVALANCHE_MAINNET_USDC,
  AVALANCHE_MAINNET_WETH,
  FUJI_USDC,
  defaultUsdcToken,
  defaultWethToken,
};
