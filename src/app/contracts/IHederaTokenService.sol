// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHederaTokenService {
    function associateToken(address account, address token) external returns (int64);
    function transferToken(address token, address from, address to, uint256 amount) external returns (int64);
    function mintToken(address token, uint256 amount, bytes[] memory metadata) external returns (int64);
    function burnToken(address token, uint256 amount, bytes[] memory metadata) external returns (int64);
    function allowance(address token, address owner, address spender) external view returns (uint256);
    function balanceOf(address token, address account) external view returns (uint256);
} 