// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RWAToken.sol";

/**
 * @title Treasury
 * @notice Accepts ETH deposits and mints RWATokens to depositors
 * @dev Admin can withdraw collected ETH. Uses ReentrancyGuard for safety.
 *      Token mint rate: 1 ETH = 1000 RWA tokens (configurable)
 */
contract Treasury is Ownable, ReentrancyGuard {

    // ─── State ───────────────────────────────────────────────────────────────
    RWAToken public immutable rwaToken;

    /// @notice How many RWA tokens are minted per 1 ETH deposited
    uint256 public tokensPerEth;

    /// @notice Total ETH deposited into treasury (lifetime)
    uint256 public totalDeposited;

    /// @notice Tracks each user's ETH deposit amount
    mapping(address => uint256) public deposits;

    // ─── Events ──────────────────────────────────────────────────────────────
    event Deposited(address indexed user, uint256 ethAmount, uint256 tokensMinted);
    event Withdrawn(address indexed admin, uint256 amount);
    event TokensPerEthUpdated(uint256 oldRate, uint256 newRate);

    // ─── Constructor ─────────────────────────────────────────────────────────
    /**
     * @param _rwaToken      Address of the RWAToken contract
     * @param _tokensPerEth  Mint rate: tokens minted per 1 ETH
     * @param _admin         Initial owner / admin address
     */
    constructor(
        address _rwaToken,
        uint256 _tokensPerEth,
        address _admin
    ) Ownable(_admin) {
        require(_rwaToken != address(0), "Treasury: token is zero address");
        require(_tokensPerEth > 0, "Treasury: rate must be > 0");

        rwaToken = RWAToken(_rwaToken);
        tokensPerEth = _tokensPerEth;
    }

    // ─── Deposit ─────────────────────────────────────────────────────────────
    /**
     * @notice Deposit ETH and receive RWA tokens in return
     * @dev Emits Deposited event. Protected against reentrancy.
     */
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Treasury: deposit amount must be > 0");

        uint256 tokenAmount = calculateTokens(msg.value);
        require(tokenAmount > 0, "Treasury: token amount too small");

        deposits[msg.sender] += msg.value;
        totalDeposited += msg.value;

        rwaToken.mint(msg.sender, tokenAmount);

        emit Deposited(msg.sender, msg.value, tokenAmount);
    }

    // ─── Withdraw ────────────────────────────────────────────────────────────
    /**
     * @notice Withdraw ETH from treasury — restricted to owner/admin only
     * @param amount  Amount of ETH (in wei) to withdraw
     * @param to      Recipient address
     */
    function withdraw(uint256 amount, address to) external onlyOwner nonReentrant {
        require(amount > 0, "Treasury: withdraw amount must be > 0");
        require(to != address(0), "Treasury: recipient is zero address");
        require(address(this).balance >= amount, "Treasury: insufficient balance");

        (bool success, ) = to.call{value: amount}("");
        require(success, "Treasury: ETH transfer failed");

        emit Withdrawn(to, amount);
    }

    // ─── Admin ───────────────────────────────────────────────────────────────
    /**
     * @notice Update token mint rate — owner only
     * @param newRate  New tokens per ETH rate
     */
    function setTokensPerEth(uint256 newRate) external onlyOwner {
        require(newRate > 0, "Treasury: rate must be > 0");
        emit TokensPerEthUpdated(tokensPerEth, newRate);
        tokensPerEth = newRate;
    }

    // ─── View ────────────────────────────────────────────────────────────────
    /**
     * @notice Preview how many tokens a given ETH amount would mint
     * @param ethAmount  ETH amount in wei
     * @return tokens    Amount of RWA tokens that would be minted
     */
    function calculateTokens(uint256 ethAmount) public view returns (uint256 tokens) {
        tokens = (ethAmount * tokensPerEth) / 1 ether;
    }

    /**
     * @notice Get current ETH balance held in treasury
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get deposit amount for a specific user
     */
    function getUserDeposit(address user) external view returns (uint256) {
        return deposits[user];
    }

    // ─── Fallback ────────────────────────────────────────────────────────────
    /// @dev Reject direct ETH sends — use deposit() instead
    receive() external payable {
        revert("Treasury: use deposit()");
    }
}