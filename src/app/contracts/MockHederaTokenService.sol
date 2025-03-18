// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IHederaTokenService.sol";

contract MockHederaTokenService is IHederaTokenService {
    mapping(address => mapping(address => uint256)) private balances;
    mapping(address => mapping(address => mapping(address => uint256))) private allowances;
    mapping(address => mapping(address => bool)) private tokenAssociations;
    address private mockHtsPrecompile;

    function setMockHtsPrecompile(address _mockHtsPrecompile) external {
        mockHtsPrecompile = _mockHtsPrecompile;
    }

    function getMockHtsPrecompile() external view returns (address) {
        return mockHtsPrecompile;
    }

    function associateToken(address account, address token) external override returns (int64) {
        tokenAssociations[account][token] = true;
        return 0;
    }

    function transferToken(address token, address from, address to, uint256 amount) external override returns (int64) {
        require(balances[token][from] >= amount, "Insufficient balance");
        balances[token][from] -= amount;
        balances[token][to] += amount;
        return 0;
    }

    function mintToken(address token, uint256 amount, bytes[] memory) external override returns (int64) {
        balances[token][msg.sender] += amount;
        return 0;
    }

    function burnToken(address token, uint256 amount, bytes[] memory) external override returns (int64) {
        require(balances[token][msg.sender] >= amount, "Insufficient balance");
        balances[token][msg.sender] -= amount;
        return 0;
    }

    function allowance(address token, address owner, address spender) external view override returns (uint256) {
        return allowances[token][owner][spender];
    }

    function balanceOf(address token, address account) external view override returns (uint256) {
        return balances[token][account];
    }

    function setBalance(address token, address account, uint256 amount) external {
        balances[token][account] = amount;
    }

    function setAllowance(address token, address owner, address spender, uint256 amount) external {
        allowances[token][owner][spender] = amount;
    }

    function setTokenAssociated(address account, address token, bool associated) external {
        tokenAssociations[account][token] = associated;
    }

    function isTokenAssociated(address account, address token) external view returns (bool) {
        return tokenAssociations[account][token];
    }

    receive() external payable {}
} 