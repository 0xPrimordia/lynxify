// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IHederaTokenService.sol";
import "hardhat/console.sol";

contract MockHederaTokenService is IHederaTokenService {
    mapping(address => mapping(address => uint256)) private balances;
    mapping(address => mapping(address => mapping(address => uint256))) private allowances;
    mapping(address => mapping(address => bool)) private tokenAssociations;
    mapping(address => bool) private mintingEnabled;
    mapping(address => address) private tokenSupplyKeyHolders;
    address private mockHtsPrecompile;
    
    // Variables for mocking responses
    int64 private mockedCreateTokenResponseCode;
    address private mockedCreateTokenAddress;
    mapping(address => mapping(address => bool)) private mockedIsSupplyKeyResults;
    
    // Special flag for testing purposes to skip SAUCE check
    bool private skipSauceAllowanceCheck = false;

    event TokenMinted(address indexed token, uint256 amount);
    event TokenBurned(address indexed token, uint256 amount);
    event TokenTransferred(address indexed token, address indexed from, address indexed to, uint256 amount);
    event TokenAssociated(address indexed account, address indexed token);
    event TokenCreated(address indexed token, string name, string symbol, address treasury);

    // Error codes to match the ones expected in the contract
    error InsufficientSauceAllowance(uint256 allowance, uint256 required);
    error InsufficientClxyAllowance(uint256 allowance, uint256 required);
    error NoSupplyKeyPermission(address token, address caller);

    constructor() {
        // Make sure all test tokens have minting enabled
        mintingEnabled[0x0000000000000000000000000000000000000001] = true; // LYNX
        mintingEnabled[0x0000000000000000000000000000000000000002] = true; // SAUCE
        mintingEnabled[0x0000000000000000000000000000000000000003] = true; // CLXY
        
        // Set supply key holders for test tokens
        tokenSupplyKeyHolders[0x0000000000000000000000000000000000000001] = address(0); // LYNX - No supply key holder by default
        tokenSupplyKeyHolders[0x0000000000000000000000000000000000000002] = address(0); // SAUCE - No supply key holder by default 
        tokenSupplyKeyHolders[0x0000000000000000000000000000000000000003] = address(0); // CLXY - No supply key holder by default
    }

    function setMockHtsPrecompile(address _mockHtsPrecompile) external {
        mockHtsPrecompile = _mockHtsPrecompile;
    }

    function getMockHtsPrecompile() external view returns (address) {
        return mockHtsPrecompile;
    }

    function associateToken(address account, address token) external override returns (int64) {
        tokenAssociations[account][token] = true;
        emit TokenAssociated(account, token);
        return 0;
    }

    function transferToken(address token, address from, address to, uint256 amount) external override returns (int64) {
        // Check token association
        require(tokenAssociations[from][token], "Token not associated with sender");
        require(tokenAssociations[to][token], "Token not associated with receiver");
        
        // Check balance
        require(balances[token][from] >= amount, "Insufficient balance");
        
        // If the sender is not the message sender, check allowance
        if (from != msg.sender) {
            uint256 currentAllowance = allowances[token][from][msg.sender];
            
            // Special handling for SAUCE token when skipSauceAllowanceCheck is true
            if (token == 0x0000000000000000000000000000000000000002 && !skipSauceAllowanceCheck) {
                // SAUCE token allowance check
                if (currentAllowance < amount) {
                    revert InsufficientSauceAllowance(currentAllowance, amount);
                }
            } 
            // Special handling for CLXY token
            else if (token == 0x0000000000000000000000000000000000000003) {
                // CLXY token allowance check
                if (currentAllowance < amount) {
                    revert InsufficientClxyAllowance(currentAllowance, amount);
                }
            }
            // Default allowance check for other tokens
            else if (token != 0x0000000000000000000000000000000000000002 || !skipSauceAllowanceCheck) {
                require(currentAllowance >= amount, "Insufficient allowance");
            }
            
            // Update allowance - don't update SAUCE allowance if skip flag is set
            if (!(token == 0x0000000000000000000000000000000000000002 && skipSauceAllowanceCheck)) {
                allowances[token][from][msg.sender] -= amount;
            }
        }

        // Transfer tokens
        balances[token][from] -= amount;
        balances[token][to] += amount;
        
        emit TokenTransferred(token, from, to, amount);
        return 0;
    }

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

    function allowance(address token, address owner, address spender) external view override returns (uint256) {
        return allowances[token][owner][spender];
    }

    function balanceOf(address token, address account) external view override returns (uint256) {
        return balances[token][account];
    }
    
    // Implementation of token creation function
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
    
    // Implement the key check function
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

    function setMintingEnabled(address token, bool enabled) external {
        mintingEnabled[token] = enabled;
    }
    
    function setSupplyKeyHolder(address token, address supplyKeyHolder) external {
        tokenSupplyKeyHolders[token] = supplyKeyHolder;
    }
    
    function getSupplyKeyHolder(address token) external view returns (address) {
        return tokenSupplyKeyHolders[token];
    }

    // New mock functions for testing
    function mockCreateTokenResponse(int64 responseCode, address tokenAddress) external {
        mockedCreateTokenResponseCode = responseCode;
        mockedCreateTokenAddress = tokenAddress;
    }
    
    function mockIsSupplyKey(address token, address supplyAddress, bool result) external {
        mockedIsSupplyKeyResults[token][supplyAddress] = result;
    }

    // New function to skip SAUCE allowance check
    function setSkipSauceAllowanceCheck(bool skip) external {
        skipSauceAllowanceCheck = skip;
    }

    receive() external payable {}
} 