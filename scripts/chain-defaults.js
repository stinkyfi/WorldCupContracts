/**
 * Well-known addresses for deploy scripts. Override via env when deploying elsewhere.
 * Add chains/tokens here as you expand support.
 */

/** Base mainnet — native USDC */
const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Base mainnet — canonical WETH (wrapped native ETH) */
const BASE_MAINNET_WETH = "0x4200000000000000000000000000000000000006";

module.exports = {
  BASE_MAINNET_USDC,
  BASE_MAINNET_WETH,
};
