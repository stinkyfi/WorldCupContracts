require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");
require("dotenv").config();

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY
  ? [process.env.DEPLOYER_PRIVATE_KEY]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  paths: {
    tests: "./test",
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    // --- Base ---
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      chainId: 8453,
      accounts: deployerKey,
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: deployerKey,
    },
    // --- Avalanche ---
    avalanche: {
      url: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: deployerKey,
    },
    fuji: {
      url: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc",
      chainId: 43113,
      accounts: deployerKey,
    },
    // --- Sonic ---
    sonic: {
      url: process.env.SONIC_RPC_URL || "https://rpc.soniclabs.com",
      chainId: 146,
      accounts: deployerKey,
    },
    sonicTestnet: {
      url: process.env.SONIC_TESTNET_RPC_URL || "https://rpc.blaze.soniclabs.com",
      chainId: 57054,
      accounts: deployerKey,
    },
  },
};
