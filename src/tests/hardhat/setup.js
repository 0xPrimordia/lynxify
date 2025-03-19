const hre = require("hardhat");

// Mock signer for testing
const mockSigner = {
  address: "0x1234567890123456789012345678901234567890",
  getAddress: () => Promise.resolve("0x1234567890123456789012345678901234567890"),
  signMessage: () => Promise.resolve("0x1234567890"),
  signTransaction: () => Promise.resolve("0x1234567890"),
  connect: () => mockSigner
};

async function setupHardhatTestEnv() {
  // Mock the network provider
  hre.network.provider.request = jest.fn().mockResolvedValue({});
  
  // Mock ethers signers
  hre.ethers.getSigners = jest.fn().mockResolvedValue([mockSigner]);

  return { signer: mockSigner };
}

module.exports = {
  setupHardhatTestEnv
}; 