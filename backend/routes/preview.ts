import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import {
  getTreasuryContract,
  getTreasuryContractWithSigner,
} from "../utils/contract.js";

const router = Router();

/**
 * POST /api/preview
 * Body: { ethAmount: "0.5" }
 * Flow:
 *  1. Calculate expected tokens before deposit
 *  2. Execute actual deposit()
 *  3. Return input amount vs actual tokens minted
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { ethAmount } = req.body;

    // ── Validate ──────────────────────────────────────────────────
    if (!ethAmount || isNaN(parseFloat(ethAmount)) || parseFloat(ethAmount) <= 0) {
      return res.status(400).json({
        success: false,
        error: "ethAmount must be a positive number",
      });
    }

    let amountWei: bigint;
    try {
      amountWei = ethers.parseEther(String(ethAmount));
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid ETH amount format",
      });
    }

    // ── Step 1: Calculate expected tokens (before deposit) ────────
    const treasury = getTreasuryContractWithSigner();

    const [expectedTokensRaw, tokensPerEth] = await Promise.all([
      treasury.calculateTokens(amountWei),
      treasury.tokensPerEth(),
    ]);

    const tx = await treasury.deposit({ value: amountWei });
    const receipt = await tx.wait();

    // ── Step 3: Parse actual tokens minted from Deposited event ──
    let actualTokensMinted = 0n;
    for (const log of receipt.logs) {
      try {
        const parsed = treasury.interface.parseLog(log);
        if (parsed?.name === "Deposited") {
          actualTokensMinted = parsed.args.tokensMinted;
          break;
        }
      } catch {
        // skip non-matching logs
      }
    }

    // ── Return input vs output ────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        input: {
          ethAmount: String(ethAmount),
        },
        output: {
          expectedTokens:    ethers.formatUnits(expectedTokensRaw, 18),
          actualTokensMinted: ethers.formatUnits(actualTokensMinted, 18),
          rate:              `1 ETH = ${ethers.formatUnits(tokensPerEth, 18)} RWA`,
          txHash:            tx.hash,
        },
      },
    });

  } catch (err: any) {
    console.error("[preview] Error:", err.message);

    if (err.message?.includes("insufficient funds")) {
      return res.status(400).json({
        success: false,
        error: "Insufficient ETH in signer wallet to make this deposit",
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

export default router;