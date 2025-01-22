// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NFTSale {
    address public owner;
    address public treasury;
    address public tokenAddress;
    uint256 public price = 100 * 10**8;  // Initial price 100 HBAR
    uint256 public constant PRICE_INCREMENT = 10 * 10**8;  // 10 HBAR increment
    uint256 public maxSupply = 100;
    uint256 public soldSupply = 0;
    uint256 public currentTokenId = 1;

    mapping(address => bool) public hasPurchased;
    
    // Essential business events only
    event NFTSold(address indexed buyer, uint256 serialNumber);
    event PaymentReceived(address from, uint256 amount);
    event PaymentForwarded(address to, uint256 amount);
    event ContractReset(address indexed owner, uint256 timestamp);
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(address _tokenAddress, address _treasury) {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
        treasury = _treasury;
    }

    function getCurrentPrice() public view returns (uint256) {
        return price;
    }

    function updatePrice() private {
        uint256 oldPrice = price;
        price = price + PRICE_INCREMENT;  // Add 10 HBAR
        emit PriceUpdated(oldPrice, price);
    }

    function purchaseNFT() external payable {
        require(msg.value == price, "Incorrect payment amount");
        require(soldSupply < maxSupply, "All NFTs sold out");
        require(!hasPurchased[msg.sender], "Already purchased");
        require(currentTokenId <= maxSupply, "No more NFTs available");

        uint256 serialToTransfer = currentTokenId;
        
        currentTokenId++;
        soldSupply++;
        hasPurchased[msg.sender] = true;
        
        emit PaymentReceived(msg.sender, msg.value);
        payable(treasury).transfer(msg.value);
        emit PaymentForwarded(treasury, msg.value);
        emit NFTSold(msg.sender, serialToTransfer);

        updatePrice();  // Increase price after successful purchase
    }

    function giveawayNFT(address recipient) external {
        require(msg.sender == owner, "Only owner can give away NFTs");
        require(soldSupply < maxSupply, "All NFTs sold out");
        require(currentTokenId <= maxSupply, "No more NFTs available");
        require(!hasPurchased[recipient], "Address already received an NFT");
        
        uint256 serialToTransfer = currentTokenId;
        
        currentTokenId++;
        soldSupply++;
        hasPurchased[recipient] = true;
        
        emit NFTSold(recipient, serialToTransfer);
    }

    function batchGiveawayNFTs(address[] calldata recipients) external {
        require(msg.sender == owner, "Only owner can give away NFTs");
        require(soldSupply + recipients.length <= maxSupply, "Not enough NFTs remaining");
        
        for(uint i = 0; i < recipients.length; i++) {
            require(!hasPurchased[recipients[i]], "Address already received an NFT");
            
            uint256 serialToTransfer = currentTokenId;
            
            currentTokenId++;
            soldSupply++;
            hasPurchased[recipients[i]] = true;
            
            emit NFTSold(recipients[i], serialToTransfer);
        }
    }

    function getPurchaseState(address buyer) external view returns (
        bool purchased,
        uint256 nextToken,
        uint256 remaining,
        uint256 currentPrice
    ) {
        return (
            hasPurchased[buyer],
            currentTokenId,
            maxSupply - soldSupply,
            price
        );
    }

    function resetContract() external {
        require(msg.sender == owner, "Only owner can reset");
        
        soldSupply = 0;
        currentTokenId = 1;
        price = 100 * 10**8;  // Reset price to initial value
        
        emit ContractReset(msg.sender, block.timestamp);
    }
}
