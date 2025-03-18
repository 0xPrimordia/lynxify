// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IHederaTokenService.sol";

contract LynxMinter {
    address public immutable LYNX_TOKEN;
    address public immutable SAUCE_TOKEN;
    address public immutable CLXY_TOKEN;
    address public immutable HTS_PRECOMPILE;
    IHederaTokenService public immutable hts;

    event LynxMinted(address indexed user, uint256 lynxAmount, uint256 hbarAmount, uint256 sauceAmount, uint256 clxyAmount);
    event LynxBurned(address indexed user, uint256 lynxAmount, uint256 hbarAmount, uint256 sauceAmount, uint256 clxyAmount);

    error InsufficientHBAR();
    error InsufficientSauceAllowance();
    error InsufficientClxyAllowance();
    error InsufficientLynxBalance();
    error InvalidAmount();
    error TokenAssociationFailed();
    error TokenTransferFailed();

    // Add ratio constants (these would eventually come from governance)
    uint256 public constant HBAR_RATIO = 10;
    uint256 public constant SAUCE_RATIO = 5;
    uint256 public constant CLXY_RATIO = 2;

    constructor(
        address lynxToken,
        address sauceToken,
        address clxyToken,
        address htsPrecompile
    ) {
        LYNX_TOKEN = lynxToken;
        SAUCE_TOKEN = sauceToken;
        CLXY_TOKEN = clxyToken;
        HTS_PRECOMPILE = htsPrecompile;
        hts = IHederaTokenService(htsPrecompile);
    }

    receive() external payable {}

    function associateTokens() external {
        // Associate LYNX token
        if (hts.associateToken(address(this), LYNX_TOKEN) != 0) revert TokenAssociationFailed();

        // Associate SAUCE token
        if (hts.associateToken(address(this), SAUCE_TOKEN) != 0) revert TokenAssociationFailed();

        // Associate CLXY token
        if (hts.associateToken(address(this), CLXY_TOKEN) != 0) revert TokenAssociationFailed();
    }

    function mint(uint256 lynxAmount) external payable {
        // Calculate required amounts based on ratios
        uint256 hbarRequired = lynxAmount * HBAR_RATIO;
        uint256 sauceRequired = lynxAmount * SAUCE_RATIO;
        uint256 clxyRequired = lynxAmount * CLXY_RATIO;

        if (msg.value < hbarRequired) revert InsufficientHBAR();

        // Check token allowances with correct ratios
        uint256 sauceAllowance = hts.allowance(SAUCE_TOKEN, msg.sender, address(this));
        if (sauceAllowance < sauceRequired) revert InsufficientSauceAllowance();

        uint256 clxyAllowance = hts.allowance(CLXY_TOKEN, msg.sender, address(this));
        if (clxyAllowance < clxyRequired) revert InsufficientClxyAllowance();

        // Transfer tokens with correct ratios
        if (hts.transferToken(SAUCE_TOKEN, msg.sender, address(this), sauceRequired) != 0) 
            revert TokenTransferFailed();

        if (hts.transferToken(CLXY_TOKEN, msg.sender, address(this), clxyRequired) != 0) 
            revert TokenTransferFailed();

        // Mint LYNX to user (1:1 with lynxAmount)
        if (hts.mintToken(LYNX_TOKEN, lynxAmount, new bytes[](0)) != 0) 
            revert TokenTransferFailed();

        if (hts.transferToken(LYNX_TOKEN, address(this), msg.sender, lynxAmount) != 0) 
            revert TokenTransferFailed();

        emit LynxMinted(msg.sender, lynxAmount, hbarRequired, sauceRequired, clxyRequired);
    }

    function burn(uint256 lynxAmount) external {
        if (lynxAmount == 0) revert InvalidAmount();

        // Calculate return amounts based on ratios
        uint256 hbarReturn = lynxAmount * HBAR_RATIO;
        uint256 sauceReturn = lynxAmount * SAUCE_RATIO;
        uint256 clxyReturn = lynxAmount * CLXY_RATIO;

        // Check LYNX balance
        uint256 lynxBalance = hts.balanceOf(LYNX_TOKEN, msg.sender);
        if (lynxBalance < lynxAmount) revert InsufficientLynxBalance();

        // Transfer and burn LYNX
        if (hts.transferToken(LYNX_TOKEN, msg.sender, address(this), lynxAmount) != 0) 
            revert TokenTransferFailed();
        if (hts.burnToken(LYNX_TOKEN, lynxAmount, new bytes[](0)) != 0) 
            revert TokenTransferFailed();

        // Return tokens with correct ratios
        if (hts.transferToken(SAUCE_TOKEN, address(this), msg.sender, sauceReturn) != 0) 
            revert TokenTransferFailed();
        if (hts.transferToken(CLXY_TOKEN, address(this), msg.sender, clxyReturn) != 0) 
            revert TokenTransferFailed();

        // Return HBAR
        (bool success,) = payable(msg.sender).call{value: hbarReturn}("");
        if (!success) revert TokenTransferFailed();

        emit LynxBurned(msg.sender, lynxAmount, hbarReturn, sauceReturn, clxyReturn);
    }
} 