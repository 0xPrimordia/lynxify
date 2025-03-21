// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHederaTokenService {
    function associateToken(address account, address token) external returns (int64);
    function transferToken(address token, address from, address to, uint256 amount) external returns (int64);
    function mintToken(address token, uint256 amount, bytes[] memory metadata) external returns (int64);
    function burnToken(address token, uint256 amount, bytes[] memory metadata) external returns (int64);
    function allowance(address token, address owner, address spender) external view returns (uint256);
    function balanceOf(address token, address account) external view returns (uint256);
    
    // Token creation function
    function createToken(
        IHederaTokenService.HederaToken memory token,
        uint initialTotalSupply,
        uint8[] memory keys,
        address[] memory keyAddresses
    ) external payable returns (int64 responseCode, address tokenAddress);
    
    // Key query functions
    function isSupplyKey(address token, address supplyAddress) external view returns (bool);
    
    // Token info struct
    struct HederaToken {
        string name;
        string symbol;
        address treasury;
        string memo;
        bool supplyType;
        uint32 maxSupply;
        bool freezeDefault;
        address[] freezeKey;
        address[] wipeKey;
        address[] supplyKey;
        address[] adminKey;
        address[] kycKey;
        uint8 decimals;
    }
} 