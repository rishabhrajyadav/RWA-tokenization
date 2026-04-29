import { expect } from "chai";
import hre from "hardhat";
import type { RWAToken, Treasury } from "../types/ethers-contracts/index.js";

const { ethers } = await hre.network.create();

describe("RWA Tokenization System", async () => {
  // ── Shared state ──────────────────────────────────────────────
  let rwaToken:  RWAToken;
  let treasury:  Treasury;
  let owner:     any;
  let user1:     any;
  let user2:     any;
  let attacker:  any;
  

  const TOKENS_PER_ETH = ethers.parseUnits("1000", 18);
  const ONE_ETH        = ethers.parseEther("1");
  const TWO_ETH        = ethers.parseEther("2");


  beforeEach(async () => {
    [owner, user1, user2, attacker] = await ethers.getSigners();

    // Deploy RWAToken
    const RWATokenFactory = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWATokenFactory.deploy("RWA Token", "RWA", owner.address);
    await rwaToken.waitForDeployment();

    // Deploy Treasury
    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    treasury = await TreasuryFactory.deploy(
      await rwaToken.getAddress(),
      TOKENS_PER_ETH,
      owner.address
    );
    await treasury.waitForDeployment();

    // Grant MINTER_ROLE to Treasury
    const MINTER_ROLE = await rwaToken.MINTER_ROLE();
    await rwaToken.connect(owner).grantRole(MINTER_ROLE, await treasury.getAddress());
  });

  // ════════════════════════════════════════════════════════════════
  // TEST SUITE 1 — Deposit Flow 
  // ════════════════════════════════════════════════════════════════
  describe("1. Deposit Flow", () => {
    it("should mint correct tokens when user deposits 1 ETH", async () => {
      const expectedTokens = ethers.parseUnits("1000", 18);

      await treasury.connect(user1).deposit({ value: ONE_ETH });

      const balance = await rwaToken.balanceOf(user1.address);
      expect(balance).to.equal(expectedTokens);
    });

    it("should update treasury ETH balance after deposit", async () => {
      await treasury.connect(user1).deposit({ value: ONE_ETH });

      const treasuryBalance = await treasury.getBalance();
      expect(treasuryBalance).to.equal(ONE_ETH);
    });

  });

  // ════════════════════════════════════════════════════════════════
  // TEST SUITE 2 — Withdrawal Flow 
  // ════════════════════════════════════════════════════════════════
  describe("2. Withdrawal Flow", () => {

    beforeEach(async () => {
      // Fund treasury first
      await treasury.connect(user1).deposit({ value: TWO_ETH });
    });

    it("should allow owner to withdraw ETH from treasury", async () => {
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      const tx     = await treasury.connect(owner).withdraw(ONE_ETH, owner.address);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

      expect(ownerBalanceAfter).to.equal(
        ownerBalanceBefore + ONE_ETH - gasUsed
      );
    });


    it("should allow owner to withdraw to a different address", async () => {
      const recipientBalanceBefore = await ethers.provider.getBalance(user2.address);

      await treasury.connect(owner).withdraw(ONE_ETH, user2.address);

      const recipientBalanceAfter = await ethers.provider.getBalance(user2.address);
      expect(recipientBalanceAfter).to.equal(recipientBalanceBefore + ONE_ETH);
    });

  });

  // ════════════════════════════════════════════════════════════════
  // TEST SUITE 3 — Edge Cases & Access Control 
  // ════════════════════════════════════════════════════════════════
  describe("3. Edge Cases & Access Control", () => {
    it("should revert when non-owner calls withdraw", async () => {
      await treasury.connect(user1).deposit({ value: ONE_ETH });
      await expect(
        treasury.connect(attacker).withdraw(ONE_ETH, attacker.address)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to update tokensPerEth rate", async () => {
      await treasury.connect(owner).setTokensPerEth(ethers.parseUnits("2000", 18));
      expect(await treasury.tokensPerEth()).to.equal(ethers.parseUnits("2000", 18))

      // New rate applies to next deposit
      await treasury.connect(user1).deposit({ value: ONE_ETH });
      const balance = await rwaToken.balanceOf(user1.address);
      expect(balance).to.equal(ethers.parseUnits("2000", 18));
    });
  });

});