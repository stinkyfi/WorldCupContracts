const hre = require("hardhat");

async function main() {
  const tokenAddr = process.env.USDC_TOKEN_ADDRESS;
  if (!tokenAddr) {
    throw new Error("Set USDC_TOKEN_ADDRESS in .env");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const BaseWorldCup = await hre.ethers.getContractFactory("BaseWorldCup");
  const tournament = await BaseWorldCup.deploy(tokenAddr, deployer.address);
  await tournament.waitForDeployment();

  console.log("BaseWorldCup:", await tournament.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
