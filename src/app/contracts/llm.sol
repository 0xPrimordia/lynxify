// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract NFTSale {
    address public owner;
    address public treasury; // Treasury account holding the NFTs
    uint256 public price = 50 * 10**8; // 300 HBAR in tinybars
    uint256 public maxSupply = 100; // Maximum NFTs to sell
    uint256 public soldSupply = 0; // Counter for sold NFTs
    address public tokenAddress; // Hedera Token ID of the NFT

    mapping(address => bool) public hasPurchased; // Tracks if a user has already purchased

    event NFTSold(address indexed buyer, uint256 serialNumber);

    constructor(address _tokenAddress, address _treasury) {
        owner = msg.sender;
        tokenAddress = _tokenAddress;
        treasury = _treasury;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    function purchaseNFT() external payable {
        require(msg.value == price, "Incorrect payment amount");
        require(soldSupply < maxSupply, "All NFTs sold out");
        require(!hasPurchased[msg.sender], "You have already purchased");

        soldSupply++;
        hasPurchased[msg.sender] = true;

        // Logic for transferring NFT from treasury to buyer goes here
        // This placeholder emits an event; real logic must interact with Hedera SDK or Hedera Token Service

        emit NFTSold(msg.sender, soldSupply);
    }

    function withdrawFunds() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
}
