// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockHTS {
    mapping(address => mapping(address => bool)) private tokenAssociations;
    mapping(address => mapping(address => int64)) private balances;
    mapping(address => mapping(address => mapping(address => int64))) private allowances;

    function setTokenAssociated(address account, address token, bool associated) external {
        tokenAssociations[account][token] = associated;
    }

    function setBalance(address token, address account, int64 balance) external {
        balances[token][account] = balance;
    }

    function setAllowance(address token, address owner, address spender, int64 amount) external {
        allowances[token][owner][spender] = amount;
    }

    function associateToken(address account, address token) external returns (int64) {
        tokenAssociations[account][token] = true;
        return 0;
    }

    function transferToken(address token, address from, address to, int64 amount) external returns (int64) {
        if (balances[token][from] < amount) {
            return 1; // Insufficient balance
        }
        balances[token][from] -= amount;
        balances[token][to] += amount;
        return 0;
    }

    function isTokenAssociated(address account, address token) external view returns (bool) {
        return tokenAssociations[account][token];
    }

    function allowance(address token, address owner, address spender) external view returns (int64) {
        return allowances[token][owner][spender];
    }

    function balanceOf(address token, address account) external view returns (int64) {
        return balances[token][account];
    }
} 