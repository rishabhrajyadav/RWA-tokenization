# RWA-tokenization# RWA Tokenization System

A simplified Real World Asset (RWA) tokenization system that simulates fractional ownership of assets using smart contracts, a Node.js backend, and a comprehensive test suite.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Smart Contracts](#smart-contracts)
- [Backend APIs](#backend-apis)
- [Setup and Installation](#setup-and-installation)
- [How to Run the Project](#how-to-run-the-project)
- [Running Tests](#running-tests)
- [Design Decisions](#design-decisions)
- [Project Structure](#project-structure)

---

## Overview

Users deposit ETH into a **Treasury** contract and receive **RWA ERC20 tokens** representing fractional ownership of a real world asset. An admin can withdraw collected ETH from the treasury at any time.

**Mint Rate:** `1 ETH = 1000 RWA tokens` (configurable by admin)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User / Admin                        │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │   Node.js Backend   │  REST API (Express + TypeScript)
          │   localhost:3000    │  ethers.js v6
          └──────────┬──────────┘
                     │
        ┌────────────▼─────────────┐
        │      Treasury.sol        │  Ownable + ReentrancyGuard
        │  deposit()  → mint tokens│
        │  withdraw() → owner only │
        └────────────┬─────────────┘
                     │ MINTER_ROLE
        ┌────────────▼─────────────┐
        │      RWAToken.sol        │  ERC20 + AccessControl
        │  mint()  → treasury only │
        │  burn()  → admin only    │
        └──────────────────────────┘
```

---

## Smart Contracts

### `RWAToken.sol`

ERC20 token representing fractional ownership of a real world asset. Minting is restricted to the Treasury contract via role-based access control.

| Function | Access | Description |
|----------|--------|-------------|
| `mint(to, amount)` | `MINTER_ROLE` only | Mint tokens to a user |
| `burn(from, amount)` | `BURNER_ROLE` only | Burn tokens from an address |
| `isMinter(account)` | Public view | Check if address has minter role |

### `Treasury.sol`

Accepts ETH deposits, mints RWA tokens proportionally, and manages admin withdrawals.

| Function | Access | Description |
|----------|--------|-------------|
| `deposit()` | Public payable | Deposit ETH and receive RWA tokens |
| `withdraw(amount, to)` | Owner only | Withdraw ETH from treasury |
| `calculateTokens(ethAmount)` | Public view | Preview tokens for a given ETH amount |
| `setTokensPerEth(newRate)` | Owner only | Update the mint rate |
| `getBalance()` | Public view | Get current treasury ETH balance |
| `getUserDeposit(user)` | Public view | Get total ETH deposited by a user |

---

## Backend APIs

Base URL: `http://localhost:3000`

### `GET /api/balance/:address`

Returns RWA token balance and total ETH deposited for a wallet address.

```bash
curl http://localhost:3000/api/balance/0xYourWalletAddress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0xYourWalletAddress",
    "tokenBalance": "1000.0",
    "symbol": "RWA",
    "ethDeposited": "1.0"
  }
}
```

---

### `GET /api/transactions/:address`

Returns event-based transaction history (deposits and transfers) for a wallet.

```bash
curl http://localhost:3000/api/transactions/0xYourWalletAddress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0xYourWalletAddress",
    "count": 1,
    "transactions": [
      {
        "type": "deposit",
        "txHash": "0xabc...",
        "blockNumber": 3,
        "timestamp": "2025-01-01T00:00:00.000Z",
        "ethAmount": "1.0",
        "tokensMinted": "1000.0"
      }
    ]
  }
}
```

---

### `POST /api/preview`

Executes an actual deposit and returns the expected vs actual tokens minted — a true deposit preview with on-chain confirmation.

```bash
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"ethAmount": "1.5"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "input": {
      "ethAmount": "1.5"
    },
    "output": {
      "expectedTokens": "1500.0",
      "actualTokensMinted": "1500.0",
      "rate": "1 ETH = 1000.0 RWA",
      "txHash": "0xabc123..."
    }
  }
}
```

---

## Setup and Installation

### Prerequisites

- Node.js v18+
- npm v9+
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/rwa-tokenization.git
cd rwa-tokenization
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# RPC URL — leave blank for local Hardhat node
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Deployer wallet private key
# For local development use Hardhat Account #0 key below (safe — it's public):
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Etherscan API key (only needed for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key

# Backend port
PORT=3000

# Deployed contract addresses — fill these after running deploy
RWA_TOKEN_ADDRESS=
TREASURY_ADDRESS=
```

### 4. Compile contracts

```bash
npm run compile
```

---

## How to Run the Project

### Option A — Local Hardhat Network (Recommended for development)

**Terminal 1** — Start the local blockchain node:

```bash
npx hardhat node
```

You will see 20 funded test accounts. Keep this terminal running.

**Terminal 2** — Deploy the contracts:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

You will see output like:

```
RWAToken deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Treasury deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
MINTER_ROLE granted to Treasury 
```

Copy both addresses into your `.env`:

```env
RWA_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
TREASURY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

**Terminal 2** — Start the backend:

```bash
npm run backend:dev
```

The API is now live at `http://localhost:3000`.

---

### Option B — Sepolia Testnet

Get free Sepolia ETH from [sepoliafaucet.com](https://sepoliafaucet.com), then:

```bash
# Deploy to Sepolia
npm run deploy:sepolia
```

Copy the deployed addresses into your `.env`, then start the backend:

```bash
npm run backend:dev
```

---

### Option C — Verify contracts on Etherscan (after Sepolia deploy)

```bash
npx hardhat verify --network sepolia YOUR_TOKEN_ADDRESS "RWA Token" "RWA" YOUR_WALLET_ADDRESS

npx hardhat verify --network sepolia YOUR_TREASURY_ADDRESS YOUR_TOKEN_ADDRESS 1000000000000000000000 YOUR_WALLET_ADDRESS
```

---

### API Quick Test

Once the backend is running, test all three endpoints:

```bash
# Health check
curl http://localhost:3000/

# Check balance
curl http://localhost:3000/api/balance/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Deposit preview (executes real deposit)
curl -X POST http://localhost:3000/api/preview \
  -H "Content-Type: application/json" \
  -d '{"ethAmount": "1"}'

# Transaction history
curl http://localhost:3000/api/transactions/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

---

## Running Tests

```bash
# Run full test suite
npx hardhat test test/RWASystem.test.ts

```

**Expected output:**

```
  RWA Tokenization System

  1. Deposit Flow
    ✔ should mint correct tokens when user deposits 1 ETH
    ✔ should update treasury ETH balance after deposit

  2. Withdrawal Flow
    ✔ should allow owner to withdraw ETH from treasury
    ✔ should allow owner to withdraw to a different address

  3. Edge Cases & Access Control
    ✔ should revert when non-owner calls withdraw
    ✔ should allow owner to update tokensPerEth rate

  6 passing
```

---

## Design Decisions

### 1. AccessControl on RWAToken instead of simple Ownable

`RWAToken` uses OpenZeppelin's `AccessControl` rather than `Ownable` because minting and burning need to be controlled by different actors independently. The Treasury contract holds `MINTER_ROLE`, while the admin holds `BURNER_ROLE` and `DEFAULT_ADMIN_ROLE`. This separation means the token contract itself is completely unaware of Treasury's business logic — it only knows who is allowed to mint. Roles can be revoked or transferred without redeploying anything.

### 2. MINTER_ROLE granted post-deployment

`MINTER_ROLE` is not granted inside the `RWAToken` constructor. It is granted to the Treasury address in the deploy script after both contracts are deployed. This avoids a circular dependency (Treasury needs the token address, token would need the treasury address) and keeps the token contract reusable — you could deploy a second Treasury and grant it minting rights without touching the token.

### 3. ReentrancyGuard on deposit and withdraw

Both `deposit()` and `withdraw()` move ETH, making them reentrancy targets. The guard ensures that if a malicious contract attempts to re-enter either function mid-execution, the transaction reverts. The checks-effects-interactions pattern is also followed — state is updated before the external mint call in `deposit()`.

### 4. receive() reverts — deposit() is the only ETH entry point

Rejecting raw ETH transfers via `receive()` forces all ETH into the system through `deposit()`, which always triggers token minting. This prevents ETH from getting permanently stuck in the contract without a corresponding mint, and makes the contract's behaviour completely predictable.

### 5. tokensPerEth stored in token-wei units (18 decimals)

The mint rate is stored as a full 18-decimal value (e.g. `1000 * 1e18` for 1000 tokens per ETH) rather than a plain integer. This keeps the `calculateTokens()` arithmetic consistent with how ERC20 balances work and avoids precision loss when dealing with fractional ETH deposits. The formula `(ethAmount * tokensPerEth) / 1 ether` works correctly at any scale.

### 6. Minimal ABI pattern in the backend

The backend imports only the function and event signatures it actually uses rather than the full compiled ABI JSON. This keeps the backend decoupled from Hardhat's build artifacts — you can update contracts, recompile, and the backend continues working as long as the interface stays compatible. All ABIs are centralised in `utils/contract.ts` so there is a single source of truth across all routes.

### 7. Event-based transaction history

Transaction history is derived entirely from on-chain events (`Deposited`, `Transfer`) rather than a database. This keeps the backend stateless and always perfectly in sync with the chain. The `Deposited` event captures the full context of each deposit in one place — user, ETH amount, and tokens minted — making reconstruction straightforward.

### 8. Promise.all for parallel on-chain reads

All read-only contract calls that don't depend on each other are batched with `Promise.all`. This halves the number of sequential RPC round trips on endpoints like `/balance` that need multiple values, keeping API response times low.

### 9. GitHub branch-based workflow

The project was built using a proper feature-branch strategy: each logical unit of work (`feature/erc20-token`, `feature/treasury-contract`, `feature/backend-apis`, `feature/tests-and-readme`) was developed on its own branch and merged into `develop` via pull request before a final `develop → main` release PR. The `main` branch is protected and only receives code that has been reviewed and tested.

---

## Project Structure

```
rwa-tokenization/
├── contracts/
│   ├── RWAToken.sol          # ERC20 with role-based minting
│   └── Treasury.sol          # Deposit, withdraw, mint rate logic
├── backend/
│   ├── src/
│   │   └── index.ts          # Express app entry point
│   ├── routes/
│   │   ├── balance.ts        # GET  /api/balance/:address
│   │   ├── transactions.ts   # GET  /api/transactions/:address
│   │   └── preview.ts        # POST /api/preview
│   └── utils/
│       └── contract.ts       # ethers.js provider + contract instances
├── scripts/
│   └── deploy.ts             # Deploy + role setup script
├── test/
│   └── RWASystem.test.ts     # 27 test cases across 4 suites
├── .env.example              # Environment variable template
├── hardhat.config.ts         # Hardhat + network configuration
├── tsconfig.json             # TypeScript configuration
└── README.md
```

---

## GitHub Workflow

```
main (protected)
 └── develop
      ├── feature/erc20-token         - merged
      ├── feature/treasury-contract   - merged
      ├── feature/backend-apis        - merged
      └── feature/tests-and-readme    - merged          
```

---

