import { expect } from "chai";
import { ethers } from "hardhat";
import { 
  Contract, 
  ContractFactory,
  ZeroAddress 
} from "ethers";
import "@nomicfoundation/hardhat-chai-matchers";

/**
 * LynxMinter Integration Tests
 * 
 * These tests verify the complete minting flow in the LynxMinter contract, including:
 * - Token creation, association and setup
 * - Supply key management
 * - Token minting with HBAR, SAUCE, and CLXY
 * - Token burning and redemption of underlying assets
 */
describe("LynxMinter Integration Tests", function () {
  // Contract instances
  let LynxMinter: ContractFactory;
  let MockHederaTokenService: ContractFactory;
  let lynxMinter: Contract;
  let mockHts: Contract;
  
  // Account addresses
  let owner: any;
  let user1: any;
  let user2: any;
  
  // Token addresses
  let lynxTokenAddress: string;
  let sauceTokenAddress: string = "0x0000000000000000000000000000000000000002"; // Fixed test address for SAUCE
  let clxyTokenAddress: string = "0x0000000000000000000000000000000000000003"; // Fixed test address for CLXY
  
  // HTS precompile address
  const HTS_PRECOMPILE = "0x0000000000000000000000000000000000000167";
  
  // Test constants for token ratios
  const HBAR_RATIO = 10n;
  const SAUCE_RATIO = 5n;
  const CLXY_RATIO = 2n;
  
  // Test amounts
  const MINT_AMOUNT = 1000n;
  const REQUIRED_HBAR = MINT_AMOUNT * HBAR_RATIO;
  const REQUIRED_SAUCE = MINT_AMOUNT * SAUCE_RATIO;
  const REQUIRED_CLXY = MINT_AMOUNT * CLXY_RATIO;

  // Deploy contracts before each test
  beforeEach(async function () {
    // Get signers (accounts)
    [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy mock HTS
    MockHederaTokenService = await ethers.getContractFactory("MockHederaTokenService");
    mockHts = await MockHederaTokenService.deploy();
    
    // Patch the HTS precompile to use our mock
    await ethers.provider.send("hardhat_setCode", [
      HTS_PRECOMPILE,
      await ethers.provider.getCode(await mockHts.getAddress())
    ]);
    
    // Deploy LynxMinter with zero address as LYNX token initially
    LynxMinter = await ethers.getContractFactory("LynxMinter");
    lynxMinter = await LynxMinter.deploy(
      ZeroAddress, // No LYNX token initially
      sauceTokenAddress,
      clxyTokenAddress
    );

    // Ensure tokens are associated with the contract
    await mockHts.setTokenAssociated(await lynxMinter.getAddress(), sauceTokenAddress, true);
    await mockHts.setTokenAssociated(await lynxMinter.getAddress(), clxyTokenAddress, true);
  });

  describe("Contract Deployment", function () {
    it("should initialize with the correct token addresses", async function () {
      const addresses = await lynxMinter.getTokenAddresses();
      expect(addresses[0]).to.equal(ZeroAddress); // LYNX is initially zero address
      expect(addresses[1]).to.equal(sauceTokenAddress); // SAUCE
      expect(addresses[2]).to.equal(clxyTokenAddress); // CLXY
    });

    it("should set the contract deployer as the admin", async function () {
      expect(await lynxMinter.ADMIN()).to.equal(owner.address);
    });

    it("should initialize with the correct token ratios", async function () {
      expect(await lynxMinter.HBAR_RATIO()).to.equal(HBAR_RATIO);
      expect(await lynxMinter.SAUCE_RATIO()).to.equal(SAUCE_RATIO);
      expect(await lynxMinter.CLXY_RATIO()).to.equal(CLXY_RATIO);
    });
  });

  describe("Token Creation", function () {
    it("should create a new LYNX token via createLynxToken", async function () {
      // Mock the token creation response
      const expectedLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHts.mockCreateTokenResponse(0, expectedLynxAddress);
      
      // Create the token
      const tx = await lynxMinter.createLynxToken("LYNX Token", "LYNX", "Token for testing");
      
      // Verify the token was created
      await expect(tx)
        .to.emit(lynxMinter, "LynxTokenCreated")
        .withArgs(expectedLynxAddress, 0);
      
      // Verify token address was stored
      expect(await lynxMinter.LYNX_TOKEN()).to.equal(expectedLynxAddress);
    });

    it("should set the contract as the supply key holder when creating a token", async function () {
      // Mock the token creation response
      const expectedLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHts.mockCreateTokenResponse(0, expectedLynxAddress);
      
      // Create the token
      await lynxMinter.createLynxToken("LYNX Token", "LYNX", "Token for testing");
      
      // Check the supply key holder in the mock
      const contractAddress = await lynxMinter.getAddress();
      expect(await mockHts.getSupplyKeyHolder(expectedLynxAddress)).to.equal(contractAddress);
      
      // Verify the contract has the supply key
      await mockHts.mockIsSupplyKey(expectedLynxAddress, contractAddress, true);
      await lynxMinter.checkSupplyKey();
      expect(await lynxMinter.hasSupplyKey()).to.be.true;
    });

    it("should revert if non-admin tries to create a token", async function () {
      await expect(
        lynxMinter.connect(user1).createLynxToken("LYNX Token", "LYNX", "Token for testing")
      ).to.be.revertedWithCustomError(lynxMinter, "OnlyAdmin");
    });

    it("should revert if trying to create a token when one already exists", async function () {
      // First create a token
      const expectedLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHts.mockCreateTokenResponse(0, expectedLynxAddress);
      await lynxMinter.createLynxToken("LYNX Token", "LYNX", "Token for testing");
      
      // Try to create another one
      await expect(
        lynxMinter.createLynxToken("LYNX Token 2", "LYNX2", "Another token")
      ).to.be.revertedWith("LYNX token already exists");
    });

    it("should handle token creation failure correctly", async function () {
      // Mock a failed token creation
      const errorCode = 123; // Some error code
      await mockHts.mockCreateTokenResponse(errorCode, ZeroAddress);
      
      // Attempt to create a token
      await expect(
        lynxMinter.createLynxToken("LYNX Token", "LYNX", "Token for testing")
      ).to.be.revertedWithCustomError(lynxMinter, "TokenCreationFailed")
        .withArgs(errorCode);
    });
  });

  describe("Token Association", function () {
    it("should associate the contract with all tokens", async function () {
      // Set up expected LYNX token address
      lynxTokenAddress = "0x0000000000000000000000000000000000001234";
      await lynxMinter.setLynxTokenId(lynxTokenAddress);
      
      // Call associateTokens
      const tx = await lynxMinter.associateTokens();
      
      // Verify events were emitted
      await expect(tx)
        .to.emit(lynxMinter, "TokensAssociated")
        .withArgs(lynxTokenAddress, 0)
        .to.emit(lynxMinter, "TokensAssociated")
        .withArgs(sauceTokenAddress, 0)
        .to.emit(lynxMinter, "TokensAssociated")
        .withArgs(clxyTokenAddress, 0);
      
      // Check associations in the mock
      const contractAddress = await lynxMinter.getAddress();
      expect(await mockHts.isTokenAssociated(contractAddress, lynxTokenAddress)).to.be.true;
      expect(await mockHts.isTokenAssociated(contractAddress, sauceTokenAddress)).to.be.true;
      expect(await mockHts.isTokenAssociated(contractAddress, clxyTokenAddress)).to.be.true;
    });
  });

  describe("Supply Key Management", function () {
    beforeEach(async function () {
      // Set LYNX token address for these tests
      lynxTokenAddress = "0x0000000000000000000000000000000000001234";
      await lynxMinter.setLynxTokenId(lynxTokenAddress);
    });

    it("should correctly detect when contract has supply key", async function () {
      // Mock the supply key check
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.mockIsSupplyKey(lynxTokenAddress, contractAddress, true);
      
      // Check supply key
      await lynxMinter.checkSupplyKey();
      expect(await lynxMinter.hasSupplyKey()).to.be.true;
    });

    it("should correctly detect when contract does not have supply key", async function () {
      // Mock the supply key check
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.mockIsSupplyKey(lynxTokenAddress, contractAddress, false);
      
      // Check supply key
      await lynxMinter.checkSupplyKey();
      expect(await lynxMinter.hasSupplyKey()).to.be.false;
    });

    it("should allow admin to force update the supply key status", async function () {
      await lynxMinter.updateSupplyKeyStatus();
      
      // Direct setter for testing
      await lynxMinter.setSupplyKeyStatus(true);
      expect(await lynxMinter.hasSupplyKey()).to.be.true;
      
      await lynxMinter.setSupplyKeyStatus(false);
      expect(await lynxMinter.hasSupplyKey()).to.be.false;
    });
  });

  describe("Token Minting", function () {
    beforeEach(async function () {
      // Set up LYNX token
      lynxTokenAddress = "0x0000000000000000000000000000000000001234";
      await lynxMinter.setLynxTokenId(lynxTokenAddress);
      
      // Give contract the supply key
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.mockIsSupplyKey(lynxTokenAddress, contractAddress, true);
      await lynxMinter.checkSupplyKey();
      
      // Associate tokens with user1
      await mockHts.setTokenAssociated(user1.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(user1.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(user1.address, clxyTokenAddress, true);
      
      // Give user1 some SAUCE and CLXY tokens
      await mockHts.setBalance(sauceTokenAddress, user1.address, REQUIRED_SAUCE * 2n);
      await mockHts.setBalance(clxyTokenAddress, user1.address, REQUIRED_CLXY * 2n);
      
      // Set allowances
      await mockHts.setAllowance(sauceTokenAddress, user1.address, contractAddress, REQUIRED_SAUCE);
      await mockHts.setAllowance(clxyTokenAddress, user1.address, contractAddress, REQUIRED_CLXY);
    });

    it("should mint tokens when all requirements are met", async function () {
      // Perform mint
      const tx = await lynxMinter.connect(user1).mint(MINT_AMOUNT, { value: REQUIRED_HBAR });
      
      // Verify event
      await expect(tx)
        .to.emit(lynxMinter, "LynxMinted")
        .withArgs(user1.address, MINT_AMOUNT, REQUIRED_HBAR, REQUIRED_SAUCE, REQUIRED_CLXY);
      
      // Check token transfers (SAUCE and CLXY from user to contract)
      const contractAddress = await lynxMinter.getAddress();
      expect(await mockHts.balanceOf(sauceTokenAddress, contractAddress)).to.equal(REQUIRED_SAUCE);
      expect(await mockHts.balanceOf(clxyTokenAddress, contractAddress)).to.equal(REQUIRED_CLXY);
      
      // Check LYNX minted to user
      expect(await mockHts.balanceOf(lynxTokenAddress, user1.address)).to.equal(MINT_AMOUNT);
    });

    it("should revert if trying to mint with incorrect HBAR amount", async function () {
      await expect(
        lynxMinter.connect(user1).mint(MINT_AMOUNT, { value: REQUIRED_HBAR - 1n })
      ).to.be.revertedWithCustomError(lynxMinter, "MustSendExactHBAR");
    });

    it("should revert if trying to mint with insufficient SAUCE allowance", async function () {
      // Set insufficient allowance
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.setAllowance(sauceTokenAddress, user1.address, contractAddress, REQUIRED_SAUCE - 1n);
      
      await expect(
        lynxMinter.connect(user1).mint(MINT_AMOUNT, { value: REQUIRED_HBAR })
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientSauceAllowance");
    });

    it("should revert if trying to mint with insufficient CLXY allowance", async function () {
      // Set insufficient allowance
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.setAllowance(clxyTokenAddress, user1.address, contractAddress, REQUIRED_CLXY - 1n);
      
      await expect(
        lynxMinter.connect(user1).mint(MINT_AMOUNT, { value: REQUIRED_HBAR })
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientClxyAllowance");
    });

    it("should revert if trying to mint with zero amount", async function () {
      await expect(
        lynxMinter.connect(user1).mint(0, { value: 0 })
      ).to.be.revertedWithCustomError(lynxMinter, "InvalidAmount");
    });

    it("should revert if contract does not have supply key", async function () {
      // Remove supply key
      await lynxMinter.setSupplyKeyStatus(false);
      
      await expect(
        lynxMinter.connect(user1).mint(MINT_AMOUNT, { value: REQUIRED_HBAR })
      ).to.be.revertedWithCustomError(lynxMinter, "NoSupplyKeyForToken");
    });
  });

  describe("Token Burning", function () {
    beforeEach(async function () {
      // Set up LYNX token
      lynxTokenAddress = "0x0000000000000000000000000000000000001234";
      await lynxMinter.setLynxTokenId(lynxTokenAddress);
      
      // Give contract the supply key
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.mockIsSupplyKey(lynxTokenAddress, contractAddress, true);
      await lynxMinter.checkSupplyKey();
      
      // Associate tokens with user1
      await mockHts.setTokenAssociated(user1.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(user1.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(user1.address, clxyTokenAddress, true);
      
      // Give user1 LYNX tokens to burn
      await mockHts.setBalance(lynxTokenAddress, user1.address, MINT_AMOUNT);
      
      // Give contract the underlying assets to return
      await mockHts.setBalance(sauceTokenAddress, contractAddress, REQUIRED_SAUCE);
      await mockHts.setBalance(clxyTokenAddress, contractAddress, REQUIRED_CLXY);
      await owner.sendTransaction({
        to: contractAddress,
        value: REQUIRED_HBAR
      });
      
      // Set user1's LYNX allowance for the contract
      await mockHts.setAllowance(lynxTokenAddress, user1.address, contractAddress, MINT_AMOUNT);
    });
    
    it("should burn tokens and return underlying assets", async function () {
      // Perform burn
      const tx = await lynxMinter.connect(user1).burn(MINT_AMOUNT);
      
      // Verify event
      await expect(tx)
        .to.emit(lynxMinter, "LynxBurned")
        .withArgs(user1.address, MINT_AMOUNT, REQUIRED_HBAR, REQUIRED_SAUCE, REQUIRED_CLXY);
      
      // Check asset transfers (SAUCE and CLXY from contract to user)
      expect(await mockHts.balanceOf(sauceTokenAddress, user1.address)).to.equal(REQUIRED_SAUCE);
      expect(await mockHts.balanceOf(clxyTokenAddress, user1.address)).to.equal(REQUIRED_CLXY);
      
      // Check LYNX burned (user's balance should be 0)
      expect(await mockHts.balanceOf(lynxTokenAddress, user1.address)).to.equal(0);
    });
    
    it("should revert if trying to burn with insufficient LYNX allowance", async function () {
      // Set insufficient allowance
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.setAllowance(lynxTokenAddress, user1.address, contractAddress, MINT_AMOUNT - 1n);
      
      await expect(
        lynxMinter.connect(user1).burn(MINT_AMOUNT)
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientLynxAllowance");
    });
    
    it("should revert if trying to burn with zero amount", async function () {
      await expect(
        lynxMinter.connect(user1).burn(0)
      ).to.be.revertedWithCustomError(lynxMinter, "InvalidAmount");
    });
    
    it("should revert if contract does not have enough SAUCE to return", async function () {
      // Reduce contract's SAUCE balance
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.setBalance(sauceTokenAddress, contractAddress, REQUIRED_SAUCE - 1n);
      
      await expect(
        lynxMinter.connect(user1).burn(MINT_AMOUNT)
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientContractBalance");
    });
    
    it("should revert if contract does not have enough CLXY to return", async function () {
      // Reduce contract's CLXY balance
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.setBalance(clxyTokenAddress, contractAddress, REQUIRED_CLXY - 1n);
      
      await expect(
        lynxMinter.connect(user1).burn(MINT_AMOUNT)
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientContractBalance");
    });
    
    it("should revert if contract does not have enough HBAR to return", async function () {
      // Drain contract's HBAR balance
      const contractAddress = await lynxMinter.getAddress();
      await owner.sendTransaction({
        to: contractAddress,
        value: -(REQUIRED_HBAR - 1n)
      });
      
      await expect(
        lynxMinter.connect(user1).burn(MINT_AMOUNT)
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientContractBalance");
    });
  });

  describe("Complete Minting Flow", function () {
    it("should support the complete flow from token creation to minting and burning", async function () {
      // Step 1: Create LYNX token
      const expectedLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHts.mockCreateTokenResponse(0, expectedLynxAddress);
      await lynxMinter.createLynxToken("LYNX Token", "LYNX", "Token for testing");
      lynxTokenAddress = await lynxMinter.LYNX_TOKEN();
      
      // Step 2: Associate tokens
      await lynxMinter.associateTokens();
      
      // Step 3: Verify supply key
      const contractAddress = await lynxMinter.getAddress();
      await mockHts.mockIsSupplyKey(lynxTokenAddress, contractAddress, true);
      await lynxMinter.checkSupplyKey();
      expect(await lynxMinter.hasSupplyKey()).to.be.true;
      
      // Step 4: Prepare user for minting
      await mockHts.setTokenAssociated(user1.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(user1.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(user1.address, clxyTokenAddress, true);
      
      await mockHts.setBalance(sauceTokenAddress, user1.address, REQUIRED_SAUCE);
      await mockHts.setBalance(clxyTokenAddress, user1.address, REQUIRED_CLXY);
      
      await mockHts.setAllowance(sauceTokenAddress, user1.address, contractAddress, REQUIRED_SAUCE);
      await mockHts.setAllowance(clxyTokenAddress, user1.address, contractAddress, REQUIRED_CLXY);
      
      // Step 5: Mint tokens
      await lynxMinter.connect(user1).mint(MINT_AMOUNT, { value: REQUIRED_HBAR });
      expect(await mockHts.balanceOf(lynxTokenAddress, user1.address)).to.equal(MINT_AMOUNT);
      
      // Step 6: Prepare for burning
      await mockHts.setAllowance(lynxTokenAddress, user1.address, contractAddress, MINT_AMOUNT);
      
      // Step 7: Burn tokens
      await lynxMinter.connect(user1).burn(MINT_AMOUNT);
      expect(await mockHts.balanceOf(lynxTokenAddress, user1.address)).to.equal(0);
      expect(await mockHts.balanceOf(sauceTokenAddress, user1.address)).to.equal(REQUIRED_SAUCE);
      expect(await mockHts.balanceOf(clxyTokenAddress, user1.address)).to.equal(REQUIRED_CLXY);
    });
  });

  describe("Admin Functions", function () {
    it("should allow admin to update token ratios", async function () {
      const newHbarRatio = 20n;
      const newSauceRatio = 10n;
      const newClxyRatio = 5n;
      
      const tx = await lynxMinter.updateRatios(newHbarRatio, newSauceRatio, newClxyRatio);
      
      await expect(tx)
        .to.emit(lynxMinter, "RatiosUpdated")
        .withArgs(newHbarRatio, newSauceRatio, newClxyRatio);
      
      expect(await lynxMinter.HBAR_RATIO()).to.equal(newHbarRatio);
      expect(await lynxMinter.SAUCE_RATIO()).to.equal(newSauceRatio);
      expect(await lynxMinter.CLXY_RATIO()).to.equal(newClxyRatio);
    });
    
    it("should revert if non-admin tries to update ratios", async function () {
      await expect(
        lynxMinter.connect(user1).updateRatios(20, 10, 5)
      ).to.be.revertedWithCustomError(lynxMinter, "OnlyAdmin");
    });
  });
}); 