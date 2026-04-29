// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RWAToken
 * @notice ERC20 token representing fractional ownership of a Real World Asset
 * @dev Minting is restricted to addresses with MINTER_ROLE (Treasury contract)
 *      Burning is restricted to addresses with BURNER_ROLE (admin/owner)
 */
contract RWAToken is ERC20, AccessControl {
    
    // ─── Roles ───────────────────────────────────────────────────────────────
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    // ─── Events ──────────────────────────────────────────────────────────────
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    // ─── Constructor ─────────────────────────────────────────────────────────
    /**
     * @param name      Token name e.g. "RWA Token"
     * @param symbol    Token symbol e.g. "RWA"
     * @param admin     Address that receives DEFAULT_ADMIN_ROLE
     */
    constructor(
        string memory name,
        string memory symbol,
        address admin
    ) ERC20(name, symbol) {
        require(admin != address(0), "RWAToken: admin is zero address");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(BURNER_ROLE, admin);
        // MINTER_ROLE is NOT granted here — Treasury gets it after deployment
    }

    // ─── Mint ────────────────────────────────────────────────────────────────
    /**
     * @notice Mint tokens to a user — callable only by Treasury (MINTER_ROLE)
     * @param to        Recipient address
     * @param amount    Amount in wei (18 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "RWAToken: mint to zero address");
        require(amount > 0, "RWAToken: amount must be > 0");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    // ─── Burn ────────────────────────────────────────────────────────────────
    /**
     * @notice Burn tokens from an address — callable only by BURNER_ROLE
     * @param from      Address to burn from
     * @param amount    Amount to burn
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        require(amount > 0, "RWAToken: amount must be > 0");
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }

    // ─── View ────────────────────────────────────────────────────────────────
    /**
     * @notice Check if an address has minter role
     */
    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }
}