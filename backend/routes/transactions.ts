import { Router, Request, Response } from "express";
import { ethers } from "ethers";
import { getRWATokenContract, getTreasuryContract, getProvider } from "../utils/contract.js";

const router = Router();

/**
 * GET /api/transactions/:address
 * Returns recent Deposited + Transfer events for a wallet
 * Query params: ?limit=10&fromBlock=0
 */
router.get("/:address", async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const limit     = parseInt(req.query.limit as string) || 10;
    const fromBlock = parseInt(req.query.fromBlock as string) || 0;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: "Invalid Ethereum address",
      });
    }

    const tokenContract   = getRWATokenContract();
    const treasuryContract = getTreasuryContract();
    const provider         = getProvider();

    // ── Fetch Deposited events from Treasury ──────────────────────
    const depositFilter = treasuryContract.filters.Deposited(address);
    const depositEvents = await treasuryContract.queryFilter(
      depositFilter,
      fromBlock,
      "latest"
    );

    // ── Fetch Transfer events from RWAToken ───────────────────────
    const transferFilterOut = tokenContract.filters.Transfer(address, null);
    const transferFilterIn  = tokenContract.filters.Transfer(null, address);
    const [transfersOut, transfersIn] = await Promise.all([
      tokenContract.queryFilter(transferFilterOut, fromBlock, "latest"),
      tokenContract.queryFilter(transferFilterIn,  fromBlock, "latest"),
    ]);

    // ── Format deposit events ─────────────────────────────────────
    const deposits = await Promise.all(
      depositEvents.map(async (e: any) => {
        const block = await provider.getBlock(e.blockNumber);
        return {
          type:         "deposit",
          txHash:       e.transactionHash,
          blockNumber:  e.blockNumber,
          timestamp:    block ? new Date(block.timestamp * 1000).toISOString() : null,
          user:         e.args.user,
          ethAmount:    ethers.formatEther(e.args.ethAmount),
          tokensMinted: ethers.formatUnits(e.args.tokensMinted, 18),
        };
      })
    );

    // ── Format transfer events ────────────────────────────────────
    const transfers = await Promise.all(
      [...transfersOut, ...transfersIn].map(async (e: any) => {
        const block = await provider.getBlock(e.blockNumber);
        return {
          type:        e.args.from === address ? "transfer_out" : "transfer_in",
          txHash:      e.transactionHash,
          blockNumber: e.blockNumber,
          timestamp:   block ? new Date(block.timestamp * 1000).toISOString() : null,
          from:        e.args.from,
          to:          e.args.to,
          amount:      ethers.formatUnits(e.args.value, 18),
        };
      })
    );

    // ── Merge, sort by block desc, limit ─────────────────────────
    const allTxns = [...deposits, ...transfers]
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, limit);

    return res.status(200).json({
      success: true,
      data: {
        address,
        count:        allTxns.length,
        transactions: allTxns,
      },
    });
  } catch (err: any) {
    console.error("[transactions] Error:", err.message);
    return res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  }
});

export default router;