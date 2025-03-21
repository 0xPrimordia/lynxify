// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IHederaTokenService.sol";

contract LynxMinter {
    // Constants
    address public constant HTS_PRECOMPILE = 0x0000000000000000000000000000000000000167;
    
    // Token addresses
    address public LYNX_TOKEN;
    address public SAUCE_TOKEN;
    address public CLXY_TOKEN;
    
    // Admin address (can update ratios)
    address public ADMIN;

    // Token configuration
    uint8 public constant TOKEN_DECIMALS = 8;
    uint32 public constant TOKEN_MAX_SUPPLY = 0; // 0 means no maximum supply
    bool public constant IS_SUPPLY_TYPE_INFINITE = true;
    
    // Ratios
    uint256 public HBAR_RATIO = 10; // 1 LYNX = 10 tinybar (0.0000001 HBAR)
    uint256 public SAUCE_RATIO = 5;  // 1 LYNX = 5 SAUCE
    uint256 public CLXY_RATIO = 2;   // 1 LYNX = 2 CLXY
    
    // State variables
    bool public hasSupplyKey = false;

    // Events
    event LynxMinted(address indexed user, uint256 lynxAmount, uint256 hbarAmount, uint256 sauceAmount, uint256 clxyAmount);
    event LynxBurned(address indexed user, uint256 lynxAmount, uint256 hbarAmount, uint256 sauceAmount, uint256 clxyAmount);
    event RatiosUpdated(uint256 hbarRatio, uint256 sauceRatio, uint256 clxyRatio);
    event TokensAssociated(address token, int64 responseCode);
    event LynxTokenCreated(address tokenAddress, int64 responseCode);
    event SupplyKeyVerified(bool hasKey);

    // Errors
    error MustSendExactHBAR(uint256 sent, uint256 required);
    error InsufficientSauceAllowance(uint256 allowance, uint256 required);
    error InsufficientClxyAllowance(uint256 allowance, uint256 required);
    error InsufficientLynxAllowance(uint256 allowance, uint256 required);
    error TokenTransferFailed(address token, int64 errorCode);
    error TokenMintFailed(address token, int64 errorCode);
    error TokenBurnFailed(address token, int64 errorCode);
    error HbarTransferFailed();
    error OnlyAdmin();
    error InvalidAmount();
    error InsufficientContractBalance(address token, uint256 balance, uint256 required);
    error TokenCreationFailed(int64 errorCode);
    error NoSupplyKeyForToken();

    // For testing purposes
    IHederaTokenService private hts;

    modifier onlyAdmin() {
        if (msg.sender != ADMIN) {
            revert OnlyAdmin();
        }
        _;
    }

    modifier supplyKeyRequired() {
        if (!hasSupplyKey) {
            revert NoSupplyKeyForToken();
        }
        _;
    }

    constructor(address lynxToken, address sauceToken, address clxyToken) {
        hts = IHederaTokenService(HTS_PRECOMPILE);
        LYNX_TOKEN = lynxToken;
        SAUCE_TOKEN = sauceToken;
        CLXY_TOKEN = clxyToken;
        ADMIN = msg.sender;
        
        // If token is not zero address, try to verify the supply key
        if (lynxToken != address(0)) {
            // Avoid using this.checkSupplyKey() in constructor
            // Instead, directly check if this contract has the supply key
            try hts.isSupplyKey(lynxToken, address(this)) returns (bool hasKey) {
                hasSupplyKey = hasKey;
            } catch {
                // Silently fail during construction - we'll check properly later
                hasSupplyKey = false;
            }
        }
    }

    // Used for testing only - allows setting a mock HTS
    function setTokenService(address mockHts) external onlyAdmin {
        hts = IHederaTokenService(mockHts);
    }
    
    // Create the LYNX token with the contract as the supply key holder
    function createLynxToken(string calldata name, string calldata symbol, string calldata memo) external onlyAdmin {
        require(LYNX_TOKEN == address(0), "LYNX token already exists");
        
        // Create token key arrays - only admin and supply keys
        address[] memory adminKey = new address[](1);
        adminKey[0] = ADMIN;
        
        address[] memory supplyKey = new address[](1);
        supplyKey[0] = address(this);
        
        address[] memory emptyKeys = new address[](0);
        
        // Create token structure
        IHederaTokenService.HederaToken memory token = IHederaTokenService.HederaToken({
            name: name,
            symbol: symbol,
            treasury: address(this),
            memo: memo,
            supplyType: IS_SUPPLY_TYPE_INFINITE,
            maxSupply: TOKEN_MAX_SUPPLY,
            freezeDefault: false,
            freezeKey: emptyKeys,
            wipeKey: emptyKeys,
            supplyKey: supplyKey,
            adminKey: adminKey,
            kycKey: emptyKeys,
            decimals: TOKEN_DECIMALS
        });
        
        // Create key types and addresses arrays
        uint8[] memory keys = new uint8[](2);
        keys[0] = 1; // Admin key
        keys[1] = 4; // Supply key
        
        address[] memory keyAddresses = new address[](2);
        keyAddresses[0] = ADMIN;
        keyAddresses[1] = address(this);
        
        // Create token
        (int64 responseCode, address tokenAddress) = hts.createToken{value: 0}(
            token,
            0, // Initial supply is 0
            keys,
            keyAddresses
        );
        
        // Check response
        if (responseCode != 0) {
            revert TokenCreationFailed(responseCode);
        }
        
        // Store token address
        LYNX_TOKEN = tokenAddress;
        
        // Associate with token
        int64 associateResponse = hts.associateToken(address(this), tokenAddress);
        
        // Verify supply key
        checkSupplyKey();
        
        emit LynxTokenCreated(tokenAddress, responseCode);
    }
    
    // Verify that this contract has the supply key for the LYNX token
    function checkSupplyKey() public {
        if (LYNX_TOKEN == address(0)) {
            hasSupplyKey = false;
            emit SupplyKeyVerified(false);
            return;
        }
        
        // Check if this contract has the supply key
        hasSupplyKey = hts.isSupplyKey(LYNX_TOKEN, address(this));
        emit SupplyKeyVerified(hasSupplyKey);
    }
    
    // Force update the hasSupplyKey status - useful for cases where the key might have been updated externally
    function updateSupplyKeyStatus() external onlyAdmin {
        checkSupplyKey();
    }
    
    // Force set the supply key status for testing purposes
    function setSupplyKeyStatus(bool status) external onlyAdmin {
        hasSupplyKey = status;
        emit SupplyKeyVerified(status);
    }

    // Helper functions for debugging
    function getHbarRatio() public view returns (uint256) {
        return HBAR_RATIO;
    }

    function getSauceRatio() public view returns (uint256) {
        return SAUCE_RATIO;
    }
    
    function getClxyRatio() public view returns (uint256) {
        return CLXY_RATIO;
    }

    // Calculate the required amounts based on LYNX amount
    function calculateRequiredHBAR(uint256 lynxAmount) external view returns (uint256) {
        return lynxAmount * HBAR_RATIO;
    }

    function calculateRequiredSAUCE(uint256 lynxAmount) external view returns (uint256) {
        return lynxAmount * SAUCE_RATIO;
    }

    function calculateRequiredCLXY(uint256 lynxAmount) external view returns (uint256) {
        return lynxAmount * CLXY_RATIO;
    }

    // Check the allowances for a specific user
    function checkAllowances(address user, uint256 lynxAmount) external view returns (
        uint256 sauceAllowance,
        uint256 clxyAllowance,
        uint256 sauceRequired,
        uint256 clxyRequired,
        bool isSauceAllowanceSufficient,
        bool isClxyAllowanceSufficient
    ) {
        sauceRequired = lynxAmount * SAUCE_RATIO;
        clxyRequired = lynxAmount * CLXY_RATIO;
        
        sauceAllowance = hts.allowance(SAUCE_TOKEN, user, address(this));
        clxyAllowance = hts.allowance(CLXY_TOKEN, user, address(this));
        
        isSauceAllowanceSufficient = sauceAllowance >= sauceRequired;
        isClxyAllowanceSufficient = clxyAllowance >= clxyRequired;
    }

    // Special test function to check only CLXY allowance
    function testClxyAllowance(uint256 lynxAmount) external payable supplyKeyRequired {
        // Validation: ensure amount is greater than zero
        if (lynxAmount == 0) {
            revert InvalidAmount();
        }
        
        // Calculate required amounts based on ratios
        uint256 hbarRequired = lynxAmount * HBAR_RATIO;
        uint256 clxyRequired = lynxAmount * CLXY_RATIO;

        // Check if the sent HBAR amount is correct
        if (msg.value != hbarRequired) {
            revert MustSendExactHBAR(msg.value, hbarRequired);
        }

        // Skip SAUCE check in this test function
        // Check only if the user has approved the contract to use their CLXY tokens
        uint256 clxyAllowance = hts.allowance(CLXY_TOKEN, msg.sender, address(this));
        if (clxyAllowance < clxyRequired) {
            revert InsufficientClxyAllowance(clxyAllowance, clxyRequired);
        }

        // This function doesn't perform any transfers - it's only for testing CLXY allowance check
    }

    // Update token ratios (admin only)
    function updateRatios(uint256 hbarRatio, uint256 sauceRatio, uint256 clxyRatio) external onlyAdmin {
        HBAR_RATIO = hbarRatio;
        SAUCE_RATIO = sauceRatio;
        CLXY_RATIO = clxyRatio;
        emit RatiosUpdated(hbarRatio, sauceRatio, clxyRatio);
    }

    // Function to associate tokens with this contract
    function associateTokens() external {
        // This function associates the contract with the token IDs
        int64 lynxResponse = hts.associateToken(address(this), LYNX_TOKEN);
        emit TokensAssociated(LYNX_TOKEN, lynxResponse);
        
        int64 sauceResponse = hts.associateToken(address(this), SAUCE_TOKEN);
        emit TokensAssociated(SAUCE_TOKEN, sauceResponse);
        
        int64 clxyResponse = hts.associateToken(address(this), CLXY_TOKEN);
        emit TokensAssociated(CLXY_TOKEN, clxyResponse);
    }

    function mint(uint256 lynxAmount) external payable supplyKeyRequired {
        // Validation: ensure amount is greater than zero
        if (lynxAmount == 0) {
            revert InvalidAmount();
        }
        
        // Calculate required amounts based on ratios
        uint256 hbarRequired = lynxAmount * HBAR_RATIO;
        uint256 sauceRequired = lynxAmount * SAUCE_RATIO;
        uint256 clxyRequired = lynxAmount * CLXY_RATIO;

        // Check if the sent HBAR amount is correct
        if (msg.value != hbarRequired) {
            revert MustSendExactHBAR(msg.value, hbarRequired);
        }

        // Check all required token balances and allowances
        // First check if the user has approved the contract to use their SAUCE tokens
        uint256 sauceAllowance = hts.allowance(SAUCE_TOKEN, msg.sender, address(this));
        if (sauceAllowance < sauceRequired) {
            revert InsufficientSauceAllowance(sauceAllowance, sauceRequired);
        }

        // Check if the user has approved the contract to use their CLXY tokens
        uint256 clxyAllowance = hts.allowance(CLXY_TOKEN, msg.sender, address(this));
        if (clxyAllowance < clxyRequired) {
            revert InsufficientClxyAllowance(clxyAllowance, clxyRequired);
        }

        // Execute the token transfers in sequence
        
        // 1. Transfer SAUCE tokens from user to contract
        int64 sauceTransferResult = hts.transferToken(SAUCE_TOKEN, msg.sender, address(this), sauceRequired);
        if (sauceTransferResult != 0) {
            revert TokenTransferFailed(SAUCE_TOKEN, sauceTransferResult);
        }

        // 2. Transfer CLXY tokens from user to contract
        int64 clxyTransferResult = hts.transferToken(CLXY_TOKEN, msg.sender, address(this), clxyRequired);
        if (clxyTransferResult != 0) {
            revert TokenTransferFailed(CLXY_TOKEN, clxyTransferResult);
        }

        // 3. Mint LYNX tokens directly to the user
        bytes[] memory metadata = new bytes[](0);
        int64 lynxMintResult = hts.mintToken(LYNX_TOKEN, lynxAmount, metadata);
        if (lynxMintResult != 0) {
            revert TokenMintFailed(LYNX_TOKEN, lynxMintResult);
        }
        
        // Transfer the minted tokens to the user
        int64 lynxTransferResult = hts.transferToken(LYNX_TOKEN, address(this), msg.sender, lynxAmount);
        if (lynxTransferResult != 0) {
            revert TokenTransferFailed(LYNX_TOKEN, lynxTransferResult);
        }

        // Emit event for successful mint
        emit LynxMinted(msg.sender, lynxAmount, hbarRequired, sauceRequired, clxyRequired);
    }

    // Burn LYNX tokens and receive HBAR, SAUCE, and CLXY
    function burn(uint256 lynxAmount) external supplyKeyRequired {
        // Validation: ensure amount is greater than zero
        if (lynxAmount == 0) {
            revert InvalidAmount();
        }
        
        // Calculate return amounts based on ratios
        uint256 hbarToReturn = lynxAmount * HBAR_RATIO;
        uint256 sauceToReturn = lynxAmount * SAUCE_RATIO;
        uint256 clxyToReturn = lynxAmount * CLXY_RATIO;

        // Check if the user has approved the contract to use their LYNX tokens
        uint256 lynxAllowance = hts.allowance(LYNX_TOKEN, msg.sender, address(this));
        if (lynxAllowance < lynxAmount) {
            revert InsufficientLynxAllowance(lynxAllowance, lynxAmount);
        }

        // Check if the contract has enough tokens to return
        if (address(this).balance < hbarToReturn) {
            revert InsufficientContractBalance(address(0), address(this).balance, hbarToReturn);
        }

        uint256 sauceBalance = hts.balanceOf(SAUCE_TOKEN, address(this));
        if (sauceBalance < sauceToReturn) {
            revert InsufficientContractBalance(SAUCE_TOKEN, sauceBalance, sauceToReturn);
        }

        uint256 clxyBalance = hts.balanceOf(CLXY_TOKEN, address(this));
        if (clxyBalance < clxyToReturn) {
            revert InsufficientContractBalance(CLXY_TOKEN, clxyBalance, clxyToReturn);
        }

        // Transfer LYNX tokens from user to contract
        int64 lynxTransferResult = hts.transferToken(LYNX_TOKEN, msg.sender, address(this), lynxAmount);
        if (lynxTransferResult != 0) {
            revert TokenTransferFailed(LYNX_TOKEN, lynxTransferResult);
        }

        // Burn the LYNX tokens
        bytes[] memory metadata = new bytes[](0);
        int64 lynxBurnResult = hts.burnToken(LYNX_TOKEN, lynxAmount, metadata);
        if (lynxBurnResult != 0) {
            revert TokenBurnFailed(LYNX_TOKEN, lynxBurnResult);
        }
        
        // Return SAUCE tokens to user
        int64 sauceTransferResult = hts.transferToken(SAUCE_TOKEN, address(this), msg.sender, sauceToReturn);
        if (sauceTransferResult != 0) {
            revert TokenTransferFailed(SAUCE_TOKEN, sauceTransferResult);
        }
        
        // Return CLXY tokens to user
        int64 clxyTransferResult = hts.transferToken(CLXY_TOKEN, address(this), msg.sender, clxyToReturn);
        if (clxyTransferResult != 0) {
            revert TokenTransferFailed(CLXY_TOKEN, clxyTransferResult);
        }
        
        // Return HBAR to user
        (bool hbarSuccess, ) = payable(msg.sender).call{value: hbarToReturn}("");
        if (!hbarSuccess) {
            revert HbarTransferFailed();
        }
        
        // Emit event for successful burn
        emit LynxBurned(msg.sender, lynxAmount, hbarToReturn, sauceToReturn, clxyToReturn);
    }

    // Get token addresses
    function getTokenAddresses() public view returns (
        address lynxToken,
        address sauceToken,
        address clxyToken
    ) {
        lynxToken = LYNX_TOKEN;
        sauceToken = SAUCE_TOKEN;
        clxyToken = CLXY_TOKEN;
    }

    // Helper function to directly check allowances for debugging
    function debugAllowances(address user) external view returns (
        uint256 sauceAllowance,
        uint256 clxyAllowance,
        uint256 lynxAllowance
    ) {
        sauceAllowance = hts.allowance(SAUCE_TOKEN, user, address(this));
        clxyAllowance = hts.allowance(CLXY_TOKEN, user, address(this));
        lynxAllowance = hts.allowance(LYNX_TOKEN, user, address(this));
    }
    
    // Allow the contract to receive HBAR directly
    receive() external payable {}
    
    // Fallback function to handle unexpected calls
    fallback() external payable {}
} 