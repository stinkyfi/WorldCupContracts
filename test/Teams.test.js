const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Teams", function () {
  let teams;

  beforeEach(async function () {
    const T = await ethers.getContractFactory("Teams");
    teams = await T.deploy();
    await teams.waitForDeployment();
  });

  it("returns Mexico for id 0", async function () {
    expect(await teams.getTeamName(0)).to.equal("Mexico");
  });

  it("returns Ghana for id 47", async function () {
    expect(await teams.getTeamName(47)).to.equal("Ghana");
  });

  it("returns Türkiye for id 15", async function () {
    expect(await teams.getTeamName(15)).to.equal("Türkiye");
  });

  it("reverts for id 48", async function () {
    await expect(teams.getTeamName(48)).to.be.revertedWith("Invalid ID");
  });

  it("returns a non-empty name for every id 0..47", async function () {
    for (let id = 0; id <= 47; id++) {
      const name = await teams.getTeamName(id);
      expect(name.length).to.be.gt(0);
    }
  });
});
