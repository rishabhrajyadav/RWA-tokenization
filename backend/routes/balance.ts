import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { getRWATokenContract, getTreasuryContract } from "../utils/contract.js";

const router = Router();

/**
 * GET /api/balance/:address
 * Returns RWA token balance + ETH deposited for a wallet
 */
router.get("/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Validate address
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Ethereum address",
      });
    }

    const tokenContract  = getRWATokenContract();
    const treasuryContract = getTreasuryContract();

    // Fetch on-chain data in parallel
    const [
      rawBalance,
      rawDeposited,
      symbol,
      decimals,
    ] = await Promise.all([
      tokenContract.balanceOf(address),
      treasuryContract.getUserDeposit(address),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        address,
        tokenBalance:    ethers.formatUnits(rawBalance, decimals),
        tokenBalanceRaw: rawBalance.toString(),
        symbol,
        ethDeposited:    ethers.formatEther(rawDeposited),
        ethDepositedRaw: rawDeposited.toString(),
      },
    });
  } catch (err: any) {
    console.error("[balance] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

export default router;