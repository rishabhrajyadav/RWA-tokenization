import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
dotenv.config();

import balanceRouter      from "../routes/balance.js";
import transactionsRouter from "../routes/transactions.js";
import previewRouter      from "../routes/preview.js";

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    status:  "ok",
    service: "RWA Tokenization API",
    version: "1.0.0",
    endpoints: {
      balance:      "GET  /api/balance/:address",
      transactions: "GET  /api/transactions/:address",
      preview:      "POST /api/preview  { ethAmount: '0.5' }",
    },
  });
});

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/balance",      balanceRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/preview",      previewRouter);

// ── 404 handler ───────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\nRWA Tokenization API running on http://localhost:${PORT}`);
  console.log(`Network: ${process.env.SEPOLIA_RPC_URL ? "Sepolia" : "Local Hardhat"}\n`);
});

export default app;