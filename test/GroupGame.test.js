const { expect } = require("chai");
const { ethers } = require("hardhat");

/** Default test pool: 20 units with 6 decimals (USDC-like). */
const ENTRY_FEE = 20n * 10n ** 6n;

/** @param {number[]} ranks length 4, values 1–4 permutation */
function packGroup(ranks) {
  const arr = new Uint8Array(4);
  for (let i = 0; i < 4; i++) arr[i] = ranks[i];
  return ethers.hexlify(arr);
}

/** @param {string} hex bytes4 hex string */
function repeat12(hex) {
  const out = [];
  for (let i = 0; i < 12; i++) out.push(hex);
  return out;
}

/**
 * @param {bigint} [entryFee]
 * @param {number} [decimals]
 */
async function deployWithMock(entryFee = ENTRY_FEE, decimals = 6) {
  const [owner, alice, bob, carol, dave] = await ethers.getSigners();
  const Mock = await ethers.getContractFactory("MockERC20");
  const usdc = await Mock.deploy("Mock Token", "mTK", decimals);
  await usdc.waitForDeployment();
  const usdcAddr = await usdc.getAddress();
  const GG = await ethers.getContractFactory("GroupGame");
  const game = await GG.deploy(usdcAddr, entryFee);
  await game.waitForDeployment();
  return { game, usdc, owner, alice, bob, carol, dave };
}

describe("GroupGame", function () {
  describe("constructor", function () {
    it("reverts ZeroToken when token is address(0)", async function () {
      const GG = await ethers.getContractFactory("GroupGame");
      await expect(GG.deploy(ethers.ZeroAddress, ENTRY_FEE)).to.be.revertedWithCustomError(
        GG,
        "ZeroToken",
      );
    });

    it("reverts ZeroEntryFee when fee is 0", async function () {
      const Mock = await ethers.getContractFactory("MockERC20");
      const t = await Mock.deploy("T", "T", 6);
      await t.waitForDeployment();
      const GG = await ethers.getContractFactory("GroupGame");
      await expect(GG.deploy(await t.getAddress(), 0n)).to.be.revertedWithCustomError(
        GG,
        "ZeroEntryFee",
      );
    });

    it("stores token address and ENTRY_FEE", async function () {
      const { game, usdc } = await deployWithMock();
      expect(await game.token()).to.equal(await usdc.getAddress());
      expect(await usdc.decimals()).to.equal(6);
      expect(await game.ENTRY_FEE()).to.equal(ENTRY_FEE);
    });

    it("supports 18-decimal token with matching ENTRY_FEE scale", async function () {
      const fee18 = ethers.parseUnits("20", 18);
      const { game, usdc } = await deployWithMock(fee18, 18);
      expect(await usdc.decimals()).to.equal(18);
      expect(await game.ENTRY_FEE()).to.equal(fee18);
    });
  });

  describe("enterPool", function () {
    const valid = repeat12(packGroup([1, 2, 3, 4]));

    it("accepts a valid 12-group entry and pulls ENTRY_FEE", async function () {
      const { game, usdc, alice } = await deployWithMock();
      await usdc.mint(alice.address, ethers.parseUnits("1000", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await expect(game.connect(alice).enterPool(valid)).to.not.be.reverted;
      expect(await usdc.balanceOf(await game.getAddress())).to.equal(ENTRY_FEE);
      expect(await game.getPlayerCount()).to.equal(1n);
      expect((await game.entries(alice.address)).exists).to.be.true;
    });

    it("reverts InvalidRanking for duplicate ranks in a group", async function () {
      const { game, usdc, alice } = await deployWithMock();
      const bad = repeat12(packGroup([1, 1, 3, 4]));
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await expect(game.connect(alice).enterPool(bad))
        .to.be.revertedWithCustomError(game, "InvalidRanking")
        .withArgs();
    });

    it("reverts InvalidRanking for rank 0", async function () {
      const { game, usdc, alice } = await deployWithMock();
      const bad = repeat12(packGroup([0, 2, 3, 4]));
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await expect(game.connect(alice).enterPool(bad)).to.be.revertedWithCustomError(
        game,
        "InvalidRanking",
      );
    });

    it("reverts InvalidRanking for rank 5", async function () {
      const { game, usdc, alice } = await deployWithMock();
      const bad = repeat12(packGroup([1, 2, 3, 5]));
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await expect(game.connect(alice).enterPool(bad)).to.be.revertedWithCustomError(
        game,
        "InvalidRanking",
      );
    });

    it("reverts AlreadyEntered on second entry", async function () {
      const { game, usdc, alice } = await deployWithMock();
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await game.connect(alice).enterPool(valid);
      await expect(game.connect(alice).enterPool(valid)).to.be.revertedWithCustomError(
        game,
        "AlreadyEntered",
      );
    });

    it("reverts without approval (ERC20 reverts on failed transferFrom)", async function () {
      const { game, usdc, alice } = await deployWithMock();
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await expect(game.connect(alice).enterPool(valid)).to.be.reverted;
    });

    it("reverts TournamentFinalized after results are set", async function () {
      const { game, usdc, owner, alice } = await deployWithMock();
      await game.connect(owner).setFinalResults(valid);
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await expect(game.connect(alice).enterPool(valid)).to.be.revertedWithCustomError(
        game,
        "TournamentFinalized",
      );
    });

    it("pulls ENTRY_FEE in 18-decimal token smallest units (WETH-style)", async function () {
      const fee18 = ethers.parseUnits("20", 18);
      const { game, usdc, alice } = await deployWithMock(fee18, 18);
      await usdc.mint(alice.address, ethers.parseUnits("1000", 18));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await expect(game.connect(alice).enterPool(valid)).to.not.be.reverted;
      expect(await usdc.balanceOf(await game.getAddress())).to.equal(fee18);
      expect((await game.entries(alice.address)).exists).to.be.true;
    });
  });

  describe("setFinalResults", function () {
    const valid = repeat12(packGroup([1, 2, 3, 4]));

    it("sets officialResults and resultsSet", async function () {
      const { game, owner } = await deployWithMock();
      await game.connect(owner).setFinalResults(valid);
      expect(await game.resultsSet()).to.be.true;
      expect(await game.officialResults(0)).to.equal(valid[0]);
    });

    it("reverts when caller is not owner", async function () {
      const { game, alice } = await deployWithMock();
      await expect(game.connect(alice).setFinalResults(valid)).to.be.revertedWithCustomError(
        game,
        "OwnableUnauthorizedAccount",
      );
    });

    it("reverts TournamentFinalized on second call (results frozen)", async function () {
      const { game, owner } = await deployWithMock();
      const alt = repeat12(packGroup([4, 3, 2, 1]));
      await game.connect(owner).setFinalResults(valid);
      await expect(game.connect(owner).setFinalResults(alt)).to.be.revertedWithCustomError(
        game,
        "TournamentFinalized",
      );
    });
  });

  describe("getScore", function () {
    const valid = repeat12(packGroup([1, 2, 3, 4]));

    it("returns 0 when user has not entered", async function () {
      const { game, owner } = await deployWithMock();
      await game.connect(owner).setFinalResults(valid);
      expect(await game.getScore(owner.address)).to.equal(0n);
    });

    it("returns 0 when results not set", async function () {
      const { game, usdc, alice } = await deployWithMock();
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await game.connect(alice).enterPool(valid);
      expect(await game.getScore(alice.address)).to.equal(0n);
    });

    it("counts per-slot matches (max 4 per group, 12 groups => 48)", async function () {
      const { game, usdc, owner, alice } = await deployWithMock();
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await game.connect(alice).enterPool(valid);
      await game.connect(owner).setFinalResults(valid);
      expect(await game.getScore(alice.address)).to.equal(48n);
    });

    it("returns partial score when predictions differ", async function () {
      const { game, usdc, owner, alice } = await deployWithMock();
      const userPick = repeat12(packGroup([1, 2, 3, 4]));
      const official = repeat12(packGroup([4, 3, 2, 1]));
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await game.connect(alice).enterPool(userPick);
      await game.connect(owner).setFinalResults(official);
      expect(await game.getScore(alice.address)).to.equal(0n);
    });

    it("scores 1 per group when exactly one slot matches (12 groups => 12)", async function () {
      const { game, usdc, owner, alice } = await deployWithMock();
      const userPick = repeat12(packGroup([1, 2, 3, 4]));
      const official = repeat12(packGroup([1, 3, 4, 2]));
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await game.connect(alice).enterPool(userPick);
      await game.connect(owner).setFinalResults(official);
      expect(await game.getScore(alice.address)).to.equal(12n);
    });
  });

  describe("distributePrizes", function () {
    const valid = repeat12(packGroup([1, 2, 3, 4]));

    async function fundPool(game, usdc, signers, n) {
      for (let i = 0; i < n; i++) {
        await usdc.mint(signers[i].address, ethers.parseUnits("100", 6));
        await usdc.connect(signers[i]).approve(await game.getAddress(), ethers.MaxUint256);
        await game.connect(signers[i]).enterPool(valid);
      }
    }

    it("splits pool evenly and sends dust to owner", async function () {
      const { game, usdc, owner, alice, bob, carol } = await deployWithMock();
      await fundPool(game, usdc, [alice, bob, carol], 3);
      await game.connect(owner).setFinalResults(valid);
      const pool = await usdc.balanceOf(await game.getAddress());
      const winners = [alice.address, bob.address];
      const aliceBefore = await usdc.balanceOf(alice.address);
      const bobBefore = await usdc.balanceOf(bob.address);
      const ownerBefore = await usdc.balanceOf(owner.address);
      const share = pool / 2n;
      const dust = pool % 2n;
      await expect(game.connect(owner).distributePrizes(winners)).to.not.be.reverted;
      expect((await usdc.balanceOf(alice.address)) - aliceBefore).to.equal(share);
      expect((await usdc.balanceOf(bob.address)) - bobBefore).to.equal(share);
      expect((await usdc.balanceOf(owner.address)) - ownerBefore).to.equal(dust);
      expect(await game.prizesDistributed()).to.be.true;
    });

    it("reverts WinnerNotInPool if winner never entered", async function () {
      const { game, usdc, owner, alice, bob } = await deployWithMock();
      await fundPool(game, usdc, [alice], 1);
      await game.connect(owner).setFinalResults(valid);
      await expect(
        game.connect(owner).distributePrizes([bob.address]),
      ).to.be.revertedWithCustomError(game, "WinnerNotInPool");
    });

    it("reverts DuplicateWinner if the same address appears twice", async function () {
      const { game, usdc, owner, alice } = await deployWithMock();
      await fundPool(game, usdc, [alice], 1);
      await game.connect(owner).setFinalResults(valid);
      await expect(
        game.connect(owner).distributePrizes([alice.address, alice.address]),
      ).to.be.revertedWithCustomError(game, "DuplicateWinner");
    });

    it("emits indexer events on enter, results, and distribution", async function () {
      const { game, usdc, owner, alice, bob } = await deployWithMock();
      const validGroups = repeat12(packGroup([1, 2, 3, 4]));
      await usdc.mint(alice.address, ethers.parseUnits("100", 6));
      await usdc.mint(bob.address, ethers.parseUnits("100", 6));
      await usdc.connect(alice).approve(await game.getAddress(), ethers.MaxUint256);
      await usdc.connect(bob).approve(await game.getAddress(), ethers.MaxUint256);

      await expect(game.connect(alice).enterPool(validGroups))
        .to.emit(game, "PoolEntered")
        .withArgs(alice.address, 0n);
      await expect(game.connect(bob).enterPool(validGroups))
        .to.emit(game, "PoolEntered")
        .withArgs(bob.address, 1n);

      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const resultsHash = ethers.keccak256(abiCoder.encode(["bytes4[12]"], [validGroups]));
      await expect(game.connect(owner).setFinalResults(validGroups))
        .to.emit(game, "OfficialResultsSet")
        .withArgs(resultsHash, validGroups);

      const pool = await usdc.balanceOf(await game.getAddress());
      const share = pool / 2n;
      const dust = pool % 2n;
      const distTx = game.connect(owner).distributePrizes([alice.address, bob.address]);
      await expect(distTx)
        .to.emit(game, "PrizesDistributed")
        .withArgs(2n, share, dust)
        .and.to.emit(game, "PrizePayout")
        .withArgs(alice.address, share)
        .and.to.emit(game, "PrizePayout")
        .withArgs(bob.address, share);
    });

    it("reverts ResultsNotSet", async function () {
      const { game, owner, alice } = await deployWithMock();
      await expect(
        game.connect(owner).distributePrizes([alice.address]),
      ).to.be.revertedWithCustomError(game, "ResultsNotSet");
    });

    it("reverts NoWinnersProvided", async function () {
      const { game, owner } = await deployWithMock();
      await game.connect(owner).setFinalResults(valid);
      await expect(game.connect(owner).distributePrizes([])).to.be.revertedWithCustomError(
        game,
        "NoWinnersProvided",
      );
    });

    it("reverts AlreadyDistributed", async function () {
      const { game, usdc, owner, alice, bob } = await deployWithMock();
      await fundPool(game, usdc, [alice, bob], 2);
      await game.connect(owner).setFinalResults(valid);
      await game.connect(owner).distributePrizes([alice.address]);
      await expect(game.connect(owner).distributePrizes([bob.address])).to.be.revertedWithCustomError(
        game,
        "AlreadyDistributed",
      );
    });

    it("reverts for non-owner", async function () {
      const { game, owner, alice, bob } = await deployWithMock();
      await game.connect(owner).setFinalResults(valid);
      await expect(game.connect(alice).distributePrizes([bob.address])).to.be.revertedWithCustomError(
        game,
        "OwnableUnauthorizedAccount",
      );
    });

    it("sends non-zero dust to owner when pool not divisible by winner count", async function () {
      const { game, usdc, owner, alice, bob, carol, dave } = await deployWithMock();
      await fundPool(game, usdc, [alice, bob, carol, dave], 4);
      await game.connect(owner).setFinalResults(valid);
      const pool = await usdc.balanceOf(await game.getAddress());
      const winners = [alice.address, bob.address, carol.address];
      const share = pool / 3n;
      const dust = pool % 3n;
      expect(dust).to.be.gt(0n);
      const a0 = await usdc.balanceOf(alice.address);
      const b0 = await usdc.balanceOf(bob.address);
      const c0 = await usdc.balanceOf(carol.address);
      const ownerBefore = await usdc.balanceOf(owner.address);
      await expect(game.connect(owner).distributePrizes(winners))
        .to.emit(game, "DustToOwner")
        .withArgs(owner.address, dust);
      expect((await usdc.balanceOf(alice.address)) - a0).to.equal(share);
      expect((await usdc.balanceOf(bob.address)) - b0).to.equal(share);
      expect((await usdc.balanceOf(carol.address)) - c0).to.equal(share);
      expect((await usdc.balanceOf(owner.address)) - ownerBefore).to.equal(dust);
    });

    it("does not emit DustToOwner when dust is zero", async function () {
      const { game, usdc, owner, alice, bob } = await deployWithMock();
      await fundPool(game, usdc, [alice, bob], 2);
      await game.connect(owner).setFinalResults(valid);
      const pool = await usdc.balanceOf(await game.getAddress());
      const dust = pool % 2n;
      expect(dust).to.equal(0n);
      const tx = await game.connect(owner).distributePrizes([alice.address, bob.address]);
      const receipt = await tx.wait();
      const iface = game.interface;
      const dustLogs = receipt.logs
        .map((l) => {
          try {
            return iface.parseLog({ topics: l.topics, data: l.data });
          } catch {
            return null;
          }
        })
        .filter((p) => p?.name === "DustToOwner");
      expect(dustLogs).to.have.length(0);
    });
  });
});
