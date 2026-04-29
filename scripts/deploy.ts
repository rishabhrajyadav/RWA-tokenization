import hre from "hardhat";

async function main() {
  const { ethers } = await hre.network.create();  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  ), "ETH\n");

  // ── 1. Deploy RWAToken ──────────────────────────────────────────
  console.log("Deploying RWAToken...");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = await RWAToken.deploy(
    "RWA Token",   // name
    "RWA",         // symbol
    deployer.address // admin
  );
  await rwaToken.waitForDeployment();
  const tokenAddress = await rwaToken.getAddress();
  console.log("RWAToken deployed to:", tokenAddress);

  // ── 2. Deploy Treasury ──────────────────────────────────────────
  console.log("\nDeploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(
    tokenAddress,       // RWAToken address
    ethers.parseUnits("1000", 18),   // 1 ETH in wei = 1000 RWA tokens in wei
    deployer.address    // admin/owner
  );
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  // ── 3. Grant MINTER_ROLE to Treasury ───────────────────────────
  console.log("\nGranting MINTER_ROLE to Treasury...");
  const MINTER_ROLE = await rwaToken.MINTER_ROLE();
  const tx = await rwaToken.grantRole(MINTER_ROLE, treasuryAddress);
  await tx.wait();
  console.log("MINTER_ROLE granted to Treasury");

  // ── 4. Verify setup ────────────────────────────────────────────
  const isMinter = await rwaToken.isMinter(treasuryAddress);
  console.log("\nTreasury is minter:", isMinter);
  console.log("\n── Deployment Summary ──────────────────────");
  console.log("RWAToken : ", tokenAddress);
  console.log("Treasury : ", treasuryAddress);
  console.log("Rate     :  1 ETH = 1000 RWA");
  console.log("Admin    : ", deployer.address);
  console.log("────────────────────────────────────────────");
  console.log("\nCopy these addresses into your .env file!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});