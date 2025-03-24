// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./IHederaTokenService.sol";
import "hardhat/console.sol";

/**
 * @title MockHederaTokenService
 * @dev Comprehensive mock implementation of the Hedera Token Service for testing
 * This contract implements all the required functionality to test the LynxMinter contract
 */
contract MockHederaTokenService is IHederaTokenService {
    // Storage for token balances
    mapping(address => mapping(address => uint256)) private balances;
    
    // Storage for token allowances
    mapping(address => mapping(address => mapping(address => uint256))) private allowances;
    
    // Track token associations
    mapping(address => mapping(address => bool)) private tokenAssociations;
    
    // Track which tokens have minting enabled
    mapping(address => bool) private mintingEnabled;
    
    // Track supply key holders for each token
    mapping(address => address) private tokenSupplyKeyHolders;
    
    // Mock HTS precompile address for testing
    address private mockHtsPrecompile;
    
    // Variables for mocking responses
    int64 private mockedCreateTokenResponseCode;
    address private mockedCreateTokenAddress;
    mapping(address => mapping(address => bool)) private mockedIsSupplyKeyResults;
    
    // Special flag for testing purposes to skip token allowance checks
    bool private skipAllowanceChecks = false;

    // Events
    event TokenMinted(address indexed token, uint256 amount);
    event TokenBurned(address indexed token, uint256 amount);
    event TokenTransferred(address indexed token, address indexed from, address indexed to, uint256 amount);
    event TokenAssociated(address indexed account, address indexed token);
    event TokenCreated(address indexed token, string name, string symbol, address treasury);

    // Custom errors
    error InsufficientTokenAllowance(address token, uint256 allowance, uint256 required);
    error NoSupplyKeyPermission(address token, address caller);

    constructor() {
        // Initialize test tokens with minting enabled
        mintingEnabled[0x0000000000000000000000000000000000000001] = true; // LYNX
        mintingEnabled[0x0000000000000000000000000000000000000002] = true; // SAUCE
        mintingEnabled[0x0000000000000000000000000000000000000003] = true; // CLXY
        
        // Set default supply key holders (none by default)
        tokenSupplyKeyHolders[0x0000000000000000000000000000000000000001] = address(0);
        tokenSupplyKeyHolders[0x0000000000000000000000000000000000000002] = address(0);
        tokenSupplyKeyHolders[0x0000000000000000000000000000000000000003] = address(0);
    }

    /**
     * @dev Set the mock HTS precompile address
     * @param _mockHtsPrecompile The address to use as the mock HTS precompile
     */
    function setMockHtsPrecompile(address _mockHtsPrecompile) external {
        mockHtsPrecompile = _mockHtsPrecompile;
    }

    /**
     * @dev Get the mock HTS precompile address
     * @return The mock HTS precompile address
     */
    function getMockHtsPrecompile() external view returns (address) {
        return mockHtsPrecompile;
    }

    /**
     * @dev Associate a token with an account
     * @param account The account to associate the token with
     * @param token The token to associate
     * @return A response code (0 = success)
     */
    function associateToken(address account, address token) external override returns (int64) {
        tokenAssociations[account][token] = true;
        emit TokenAssociated(account, token);
        return 0;
    }

    /**
     * @dev Transfer tokens from one account to another
     * @param token The token to transfer
     * @param from The account to transfer from
     * @param to The account to transfer to
     * @param amount The amount to transfer
     * @return A response code (0 = success)
     */
    function transferToken(address token, address from, address to, uint256 amount) external override returns (int64) {
        // Check token association
        require(tokenAssociations[from][token], "Token not associated with sender");
        require(tokenAssociations[to][token], "Token not associated with receiver");
        
        // Check balance
        require(balances[token][from] >= amount, "Insufficient balance");
        
        // If the sender is not the message sender, check allowance
        if (from != msg.sender && !skipAllowanceChecks) {
            uint256 currentAllowance = allowances[token][from][msg.sender];
            
            if (currentAllowance < amount) {
                revert InsufficientTokenAllowance(token, currentAllowance, amount);
            }
            
            // Update allowance
            allowances[token][from][msg.sender] -= amount;
        }

        // Transfer tokens
        balances[token][from] -= amount;
        balances[token][to] += amount;
        
        emit TokenTransferred(token, from, to, amount);
        return 0;
    }

    /**
     * @dev Mint new tokens
     * @param token The token to mint
     * @param amount The amount to mint
     * @return A response code (0 = success)
     */
    function mintToken(address token, uint256 amount, bytes[] memory) external override returns (int64) {
        // Check if minting is enabled for this token
        require(mintingEnabled[token], "Minting not enabled for this token");
        
        // Check if caller has the supply key for the token
        address supplyKeyHolder = tokenSupplyKeyHolders[token];
        if (supplyKeyHolder != address(0) && msg.sender != supplyKeyHolder) {
            revert NoSupplyKeyPermission(token, msg.sender);
        }
        
        // In Hedera, when a contract mints tokens, they are added to the contract's balance
        balances[token][msg.sender] += amount;
        emit TokenMinted(token, amount);
        return 0;
    }

    /**
     * @dev Burn tokens
     * @param token The token to burn
     * @param amount The amount to burn
     * @return A response code (0 = success)
     */
    function burnToken(address token, uint256 amount, bytes[] memory) external override returns (int64) {
        // Check if caller has the supply key for the token
        address supplyKeyHolder = tokenSupplyKeyHolders[token];
        if (supplyKeyHolder != address(0) && msg.sender != supplyKeyHolder) {
            revert NoSupplyKeyPermission(token, msg.sender);
        }
        
        require(balances[token][msg.sender] >= amount, "Insufficient balance to burn");
        balances[token][msg.sender] -= amount;
        emit TokenBurned(token, amount);
        return 0;
    }

    /**
     * @dev Get the allowance of tokens that a spender can use from an owner
     * @param token The token to check allowance for
     * @param owner The owner of the tokens
     * @param spender The spender who can use the tokens
     * @return The amount of tokens the spender can use
     */
    function allowance(address token, address owner, address spender) external view override returns (uint256) {
        return allowances[token][owner][spender];
    }

    /**
     * @dev Get the balance of tokens for an account
     * @param token The token to check the balance of
     * @param account The account to check the balance for
     * @return The balance of tokens
     */
    function balanceOf(address token, address account) external view override returns (uint256) {
        return balances[token][account];
    }
    
    /**
     * @dev Create a new token
     * @param token The token configuration
     * @param initialTotalSupply The initial supply to mint
     * @param keys The key types to set
     * @param keyAddresses The addresses for each key
     * @return responseCode A response code (0 = success)
     * @return tokenAddress The address of the created token
     */
    function createToken(
        IHederaTokenService.HederaToken memory token,
        uint initialTotalSupply,
        uint8[] memory keys,
        address[] memory keyAddresses
    ) external payable override returns (int64 responseCode, address tokenAddress) {
        // If a mocked response is set, use it
        if (mockedCreateTokenAddress != address(0)) {
            tokenAddress = mockedCreateTokenAddress;
            responseCode = mockedCreateTokenResponseCode;
            
            // Reset mocked values
            mockedCreateTokenAddress = address(0);
            mockedCreateTokenResponseCode = 0;
            
            // Enable minting for this token
            mintingEnabled[tokenAddress] = true;
            
            // Set the treasury
            if (initialTotalSupply > 0) {
                balances[tokenAddress][token.treasury] = initialTotalSupply;
            }
            
            // Associate the token with the treasury
            tokenAssociations[token.treasury][tokenAddress] = true;
            
            // Process keys
            for (uint i = 0; i < keys.length; i++) {
                if (keys[i] == 4) { // Supply key
                    tokenSupplyKeyHolders[tokenAddress] = keyAddresses[i];
                }
            }
            
            emit TokenCreated(tokenAddress, token.name, token.symbol, token.treasury);
            return (responseCode, tokenAddress);
        }
        
        // Generate a new token address - use a simple approach for mock
        tokenAddress = address(uint160(uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, token.name)))));
        
        // Enable minting for this token
        mintingEnabled[tokenAddress] = true;
        
        // Set the treasury
        if (initialTotalSupply > 0) {
            balances[tokenAddress][token.treasury] = initialTotalSupply;
        }
        
        // Associate the token with the treasury
        tokenAssociations[token.treasury][tokenAddress] = true;
        
        // Process keys
        for (uint i = 0; i < keys.length; i++) {
            if (keys[i] == 4) { // Supply key
                tokenSupplyKeyHolders[tokenAddress] = keyAddresses[i];
            }
        }
        
        emit TokenCreated(tokenAddress, token.name, token.symbol, token.treasury);
        return (0, tokenAddress);
    }
    
    /**
     * @dev Check if an address has the supply key for a token
     * @param token The token to check
     * @param supplyAddress The address to check
     * @return True if the address has the supply key
     */
    function isSupplyKey(address token, address supplyAddress) external view override returns (bool) {
        // Return a specific mocked value if set
        bool mockedValue = mockedIsSupplyKeyResults[token][supplyAddress];
        
        if (mockedValue) {
            return true;
        }
        
        // Otherwise use the default supply key holder value
        return tokenSupplyKeyHolders[token] == supplyAddress;
    }

    // Test helper functions - not part of the real HTS interface

    /**
     * @dev Set the balance of tokens for an account (test helper)
     */
    function setBalance(address token, address account, uint256 amount) external {
        balances[token][account] = amount;
    }

    /**
     * @dev Set the allowance of tokens for a spender (test helper)
     */
    function setAllowance(address token, address owner, address spender, uint256 amount) external {
        allowances[token][owner][spender] = amount;
    }

    /**
     * @dev Set a token as associated with an account (test helper)
     */
    function setTokenAssociated(address account, address token, bool associated) external {
        tokenAssociations[account][token] = associated;
    }

    /**
     * @dev Check if a token is associated with an account (test helper)
     */
    function isTokenAssociated(address account, address token) external view returns (bool) {
        return tokenAssociations[account][token];
    }

    /**
     * @dev Set whether minting is enabled for a token (test helper)
     */
    function setMintingEnabled(address token, bool enabled) external {
        mintingEnabled[token] = enabled;
    }
    
    /**
     * @dev Set the supply key holder for a token (test helper)
     */
    function setSupplyKeyHolder(address token, address supplyKeyHolder) external {
        tokenSupplyKeyHolders[token] = supplyKeyHolder;
    }
    
    /**
     * @dev Get the supply key holder for a token (test helper)
     */
    function getSupplyKeyHolder(address token) external view returns (address) {
        return tokenSupplyKeyHolders[token];
    }

    /**
     * @dev Mock the response for createToken (test helper)
     */
    function mockCreateTokenResponse(int64 responseCode, address tokenAddress) external {
        mockedCreateTokenResponseCode = responseCode;
        mockedCreateTokenAddress = tokenAddress;
    }
    
    /**
     * @dev Mock the response for isSupplyKey (test helper)
     */
    function mockIsSupplyKey(address token, address supplyAddress, bool result) external {
        mockedIsSupplyKeyResults[token][supplyAddress] = result;
    }

    /**
     * @dev Skip allowance checks for testing purposes
     */
    function setSkipAllowanceChecks(bool skip) external {
        skipAllowanceChecks = skip;
    }

    receive() external payable {}
} 