import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

// ── ABIs (minimal — only functions we need) ──────────────────────
const RWA_TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event TokensMinted(address indexed to, uint256 amount)",
];

const TREASURY_ABI = [
  "function deposit() external payable",  
  "function withdraw(uint256 amount, address to) external onlyOwner nonReentrant",
  "function tokensPerEth() view returns (uint256)",
  "function totalDeposited() view returns (uint256)",
  "function calculateTokens(uint256 ethAmount) view returns (uint256)",
  "function getUserDeposit(address user) view returns (uint256)",
  "function getBalance() view returns (uint256)",
  "event Deposited(address indexed user, uint256 ethAmount, uint256 tokensMinted)",
  "event Withdrawn(address indexed admin, uint256 amount)",
];

// ── Provider setup ────────────────────────────────────────────────
function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(rpcUrl);
}

// ── Contract instances ────────────────────────────────────────────
export function getRWATokenContract(): ethers.Contract {
  const address = process.env.RWA_TOKEN_ADDRESS;
  if (!address) throw new Error("RWA_TOKEN_ADDRESS not set in .env");
  return new ethers.Contract(address, RWA_TOKEN_ABI, getProvider());
}

export function getTreasuryContract(): ethers.Contract {
  const address = process.env.TREASURY_ADDRESS;
  if (!address) throw new Error("TREASURY_ADDRESS not set in .env");
  return new ethers.Contract(address, TREASURY_ABI, getProvider());
}

// ── Signer-connected Treasury (for write transactions) ────────────
export function getTreasuryContractWithSigner(): ethers.Contract {
    const address = process.env.TREASURY_ADDRESS;
    const privateKey = process.env.PRIVATE_KEY;
  
    if (!address) throw new Error("TREASURY_ADDRESS not set in .env");
    if (!privateKey) throw new Error("PRIVATE_KEY not set in .env");
  
    const signer = new ethers.Wallet(privateKey, getProvider());
    return new ethers.Contract(address, TREASURY_ABI, signer);
  }
  

export { getProvider };