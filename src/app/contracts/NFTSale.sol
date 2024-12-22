// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NFTSale {
    address public owner;
    address public treasury;
    address public tokenAddress;
    uint256 public price = 50 * 10**8;  // 50 HBAR
    uint256 public maxSupply = 100;
    uint256 public soldSupply = 0;
    uint256 public currentTokenId = 2;

    mapping(address => bool) public hasPurchased;

    // Debug events
    event Debug(string message, address sender, uint256 value);
    event StateChange(string operation, uint256 tokenId, uint256 newSoldSupply);
    event PaymentDebug(string message, address from, address to, uint256 amount);
    
    // Business events
    event PurchaseInitiated(address buyer, uint256 value);
    event NFTSold(address indexed buyer, uint256 serialNumber);
    event PaymentReceived(address from, uint256 amount);
    event PaymentForwarded(address to, uint256 amount);
    event ContractReset(address indexed owner, uint256 timestamp);

    constructor(address _tokenAddress, address _treasury) {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
        treasury = _treasury;
        emit Debug("Contract initialized", msg.sender, 0);
        emit StateChange("init", currentTokenId, soldSupply);
    }

    function resetContract() external {
        require(msg.sender == owner, "Only owner can reset");
        
        // Reset counters
        soldSupply = 0;
        currentTokenId = 2;  // Reset to initial value
        
        // Emit events
        emit Debug("Contract reset", msg.sender, block.timestamp);
        emit StateChange("reset", currentTokenId, soldSupply);
        emit ContractReset(msg.sender, block.timestamp);
    }

    function purchaseNFT() external payable {
        emit Debug("Purchase started", msg.sender, msg.value);
        
        // Validate purchase
        emit Debug("Checking payment", msg.sender, msg.value);
        require(msg.value == price, "Incorrect payment amount");
        emit PaymentDebug("Payment validation", msg.sender, address(this), msg.value);
        
        emit Debug("Checking supply", msg.sender, soldSupply);
        require(soldSupply < maxSupply, "All NFTs sold out");
        
        emit Debug("Checking previous purchase", msg.sender, hasPurchased[msg.sender] ? 1 : 0);
        require(!hasPurchased[msg.sender], "Already purchased");
        
        emit Debug("Checking token ID", msg.sender, currentTokenId);
        require(currentTokenId <= maxSupply, "No more NFTs available");

        // Record the purchase
        uint256 serialToTransfer = currentTokenId;
        emit Debug("Recording purchase", msg.sender, serialToTransfer);
        
        currentTokenId++;
        soldSupply++;
        hasPurchased[msg.sender] = true;
        
        emit StateChange("purchase", currentTokenId, soldSupply);
        emit PurchaseInitiated(msg.sender, msg.value);
        emit PaymentReceived(msg.sender, msg.value);

        // Forward payment to treasury
        emit PaymentDebug("Forwarding payment", address(this), treasury, msg.value);
        payable(treasury).transfer(msg.value);
        emit PaymentForwarded(treasury, msg.value);

        // Final confirmation
        emit NFTSold(msg.sender, serialToTransfer);
        emit Debug("Purchase completed", msg.sender, serialToTransfer);
    }

    // View functions for debugging
    function getPurchaseState(address buyer) external view returns (
        bool purchased,
        uint256 nextToken,
        uint256 remaining
    ) {
        return (
            hasPurchased[buyer],
            currentTokenId,
            maxSupply - soldSupply
        );
    }
}
