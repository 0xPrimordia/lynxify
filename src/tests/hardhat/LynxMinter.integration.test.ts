import { expect } from "chai";
import { ethers } from "hardhat";

describe("LynxMinter Integration Tests", function () {
  let lynxMinter: any;
  let mockHTS: any;
  let lynxToken: string;
  let sauceToken: any;
  let clxyToken: any;
  let admin: any;
  let user: any;
  let adminAddress: string;
  let userAddress: string;
  
  const TOKEN_DECIMALS = 8n;
  const LYNX_AMOUNT = ethers.parseUnits("100", TOKEN_DECIMALS);
  const HBAR_RATIO = 10n;
  const SAUCE_RATIO = 5n;
  const CLXY_RATIO = 2n;
  
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const HTS_PRECOMPILE = "0x0000000000000000000000000000000000000167";
  
  // Helper to calculate required token amounts
  const calculateRequiredAmount = (lynxAmount: bigint, ratio: bigint): bigint => {
    return lynxAmount * ratio;
  };
  
  beforeEach(async function () {
    // Get signers
    [admin, user] = await ethers.getSigners();
    adminAddress = await admin.getAddress();
    userAddress = await user.getAddress();
    
    // Deploy mock tokens for SAUCE and CLXY
    const MockToken = await ethers.getContractFactory("MockToken");
    sauceToken = await MockToken.deploy("SAUCE Token", "SAUCE");
    clxyToken = await MockToken.deploy("CLXY Token", "CLXY");
    
    // Deploy the mock HTS implementation
    const MockHTS = await ethers.getContractFactory("MockHederaTokenService");
    mockHTS = await MockHTS.deploy();
    
    // Deploy LynxMinter with null LYNX token address
    const LynxMinter = await ethers.getContractFactory("LynxMinter");
    lynxMinter = await LynxMinter.deploy(
      ZERO_ADDRESS,
      sauceToken.target,
      clxyToken.target
    );
    
    // Set the mock HTS implementation in the LynxMinter
    await lynxMinter.setTokenService(mockHTS.target);
    
    // Mint initial tokens to the user
    await sauceToken.mint(userAddress, ethers.parseUnits("1000", TOKEN_DECIMALS));
    await clxyToken.mint(userAddress, ethers.parseUnits("1000", TOKEN_DECIMALS));
    
    // Associate tokens with the contract
    await mockHTS.setTokenAssociated(lynxMinter.target, sauceToken.target, true);
    await mockHTS.setTokenAssociated(lynxMinter.target, clxyToken.target, true);
  });
  
  describe("Token Creation", function () {
    it("should allow admin to create LYNX token", async function () {
      // Mock the HTS response for token creation
      const mockLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHTS.mockCreateTokenResponse(0, mockLynxAddress);
      
      // Mock that the contract has supply key
      await mockHTS.mockIsSupplyKey(mockLynxAddress, lynxMinter.target, true);
      
      // Create the LYNX token
      const tx = await lynxMinter.createLynxToken("LYNX Token", "LYNX", "LYNX token for testing");
      
      // Check events
      await expect(tx)
        .to.emit(lynxMinter, "LynxTokenCreated")
        .withArgs(mockLynxAddress, 0);
      
      await expect(tx)
        .to.emit(lynxMinter, "SupplyKeyVerified")
        .withArgs(true);
      
      // Verify contract state
      expect(await lynxMinter.LYNX_TOKEN()).to.equal(mockLynxAddress);
      expect(await lynxMinter.hasSupplyKey()).to.equal(true);
    });
    
    it("should revert if non-admin tries to create LYNX token", async function () {
      await expect(
        lynxMinter.connect(user).createLynxToken("LYNX Token", "LYNX", "LYNX token for testing")
      ).to.be.revertedWithCustomError(lynxMinter, "OnlyAdmin");
    });
    
    it("should revert if LYNX token already exists", async function () {
      // First create the token
      const mockLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHTS.mockCreateTokenResponse(0, mockLynxAddress);
      await mockHTS.mockIsSupplyKey(mockLynxAddress, lynxMinter.target, true);
      await lynxMinter.createLynxToken("LYNX Token", "LYNX", "LYNX token for testing");
      
      // Try to create it again
      await expect(
        lynxMinter.createLynxToken("LYNX Token", "LYNX", "LYNX token for testing")
      ).to.be.revertedWith("LYNX token already exists");
    });
    
    it("should handle token creation failure", async function () {
      // Mock a failure in token creation
      await mockHTS.mockCreateTokenResponse(123, ZERO_ADDRESS);
      
      await expect(
        lynxMinter.createLynxToken("LYNX Token", "LYNX", "LYNX token for testing")
      ).to.be.revertedWithCustomError(lynxMinter, "TokenCreationFailed")
      .withArgs(123);
    });
  });
  
  describe("Token Association", function () {
    it("should associate tokens with the contract", async function () {
      const mockLynxAddress = "0x0000000000000000000000000000000000001234";
      await lynxMinter.setLynxTokenId(mockLynxAddress);
      
      const tx = await lynxMinter.associateTokens();
      
      await expect(tx)
        .to.emit(lynxMinter, "TokensAssociated")
        .withArgs(mockLynxAddress, 0);
      
      await expect(tx)
        .to.emit(lynxMinter, "TokensAssociated")
        .withArgs(sauceToken.target, 0);
      
      await expect(tx)
        .to.emit(lynxMinter, "TokensAssociated")
        .withArgs(clxyToken.target, 0);
    });
  });
  
  describe("Minting Tokens", function () {
    beforeEach(async function () {
      // Create and set up LYNX token for testing
      const mockLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHTS.mockCreateTokenResponse(0, mockLynxAddress);
      await mockHTS.mockIsSupplyKey(mockLynxAddress, lynxMinter.target, true);
      await lynxMinter.createLynxToken("LYNX Token", "LYNX", "LYNX token for testing");
      lynxToken = mockLynxAddress;
      
      // Associate tokens
      await mockHTS.setTokenAssociated(userAddress, lynxToken, true);
      await mockHTS.setTokenAssociated(lynxMinter.target, lynxToken, true);
      
      // Approve tokens
      const requiredSauce = calculateRequiredAmount(LYNX_AMOUNT, SAUCE_RATIO);
      const requiredClxy = calculateRequiredAmount(LYNX_AMOUNT, CLXY_RATIO);
      
      await mockHTS.setAllowance(
        sauceToken.target, 
        userAddress, 
        lynxMinter.target, 
        requiredSauce
      );
      
      await mockHTS.setAllowance(
        clxyToken.target, 
        userAddress, 
        lynxMinter.target, 
        requiredClxy
      );
    });
    
    it("should mint LYNX tokens when all conditions are met", async function () {
      // Calculate required amounts
      const requiredHbar = calculateRequiredAmount(LYNX_AMOUNT, HBAR_RATIO);
      const requiredSauce = calculateRequiredAmount(LYNX_AMOUNT, SAUCE_RATIO);
      const requiredClxy = calculateRequiredAmount(LYNX_AMOUNT, CLXY_RATIO);
      
      // Execute mint
      const tx = await lynxMinter.connect(user).mint(LYNX_AMOUNT, { value: requiredHbar });
      
      // Check event
      await expect(tx)
        .to.emit(lynxMinter, "LynxMinted")
        .withArgs(userAddress, LYNX_AMOUNT, requiredHbar, requiredSauce, requiredClxy);
      
      // Verify token transfers occurred
      expect(await mockHTS.balanceOf(lynxToken, userAddress)).to.equal(LYNX_AMOUNT);
    });
    
    it("should revert if insufficient HBAR is sent", async function () {
      const requiredHbar = calculateRequiredAmount(LYNX_AMOUNT, HBAR_RATIO);
      const insufficientHbar = requiredHbar - 1n;
      
      await expect(
        lynxMinter.connect(user).mint(LYNX_AMOUNT, { value: insufficientHbar })
      ).to.be.revertedWithCustomError(lynxMinter, "MustSendExactHBAR")
      .withArgs(insufficientHbar, requiredHbar);
    });
    
    it("should revert if insufficient SAUCE allowance", async function () {
      const requiredHbar = calculateRequiredAmount(LYNX_AMOUNT, HBAR_RATIO);
      const requiredSauce = calculateRequiredAmount(LYNX_AMOUNT, SAUCE_RATIO);
      const insufficientSauce = requiredSauce - 1n;
      
      // Set insufficient allowance
      await mockHTS.setAllowance(
        sauceToken.target, 
        userAddress, 
        lynxMinter.target, 
        insufficientSauce
      );
      
      await expect(
        lynxMinter.connect(user).mint(LYNX_AMOUNT, { value: requiredHbar })
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientSauceAllowance")
      .withArgs(insufficientSauce, requiredSauce);
    });
    
    it("should revert if insufficient CLXY allowance", async function () {
      const requiredHbar = calculateRequiredAmount(LYNX_AMOUNT, HBAR_RATIO);
      const requiredClxy = calculateRequiredAmount(LYNX_AMOUNT, CLXY_RATIO);
      const insufficientClxy = requiredClxy - 1n;
      
      // Set insufficient allowance
      await mockHTS.setAllowance(
        clxyToken.target, 
        userAddress, 
        lynxMinter.target, 
        insufficientClxy
      );
      
      await expect(
        lynxMinter.connect(user).mint(LYNX_AMOUNT, { value: requiredHbar })
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientClxyAllowance")
      .withArgs(insufficientClxy, requiredClxy);
    });
    
    it("should revert if trying to mint with amount 0", async function () {
      await expect(
        lynxMinter.connect(user).mint(0n, { value: 0n })
      ).to.be.revertedWithCustomError(lynxMinter, "InvalidAmount");
    });
    
    it("should revert if contract doesn't have the supply key", async function () {
      // Remove supply key
      await lynxMinter.setSupplyKeyStatus(false);
      
      const requiredHbar = calculateRequiredAmount(LYNX_AMOUNT, HBAR_RATIO);
      
      await expect(
        lynxMinter.connect(user).mint(LYNX_AMOUNT, { value: requiredHbar })
      ).to.be.revertedWithCustomError(lynxMinter, "NoSupplyKeyForToken");
    });
  });
  
  describe("Burning Tokens", function () {
    beforeEach(async function () {
      // Create and set up LYNX token for testing
      const mockLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHTS.mockCreateTokenResponse(0, mockLynxAddress);
      await mockHTS.mockIsSupplyKey(mockLynxAddress, lynxMinter.target, true);
      await lynxMinter.createLynxToken("LYNX Token", "LYNX", "LYNX token for testing");
      lynxToken = mockLynxAddress;
      
      // Associate tokens
      await mockHTS.setTokenAssociated(userAddress, lynxToken, true);
      await mockHTS.setTokenAssociated(lynxMinter.target, lynxToken, true);
      
      // Give user some LYNX tokens
      await mockHTS.setBalance(lynxToken, userAddress, LYNX_AMOUNT);
      
      // Give contract tokens and HBAR for burning
      const requiredHbar = calculateRequiredAmount(LYNX_AMOUNT, HBAR_RATIO);
      const requiredSauce = calculateRequiredAmount(LYNX_AMOUNT, SAUCE_RATIO);
      const requiredClxy = calculateRequiredAmount(LYNX_AMOUNT, CLXY_RATIO);
      
      await mockHTS.setBalance(
        sauceToken.target, 
        lynxMinter.target, 
        requiredSauce
      );
      
      await mockHTS.setBalance(
        clxyToken.target, 
        lynxMinter.target, 
        requiredClxy
      );
      
      // Send HBAR to contract
      await admin.sendTransaction({
        to: lynxMinter.target,
        value: requiredHbar
      });
      
      // Set allowance for LYNX
      await mockHTS.setAllowance(
        lynxToken, 
        userAddress, 
        lynxMinter.target, 
        LYNX_AMOUNT
      );
    });
    
    it("should burn LYNX tokens and return assets", async function () {
      const requiredHbar = calculateRequiredAmount(LYNX_AMOUNT, HBAR_RATIO);
      const requiredSauce = calculateRequiredAmount(LYNX_AMOUNT, SAUCE_RATIO);
      const requiredClxy = calculateRequiredAmount(LYNX_AMOUNT, CLXY_RATIO);
      
      // Get initial balances
      const initialUserEthBalance = await ethers.provider.getBalance(userAddress);
      
      // Execute burn
      const tx = await lynxMinter.connect(user).burn(LYNX_AMOUNT);
      const receipt = await tx.wait();
      const gasCost = BigInt(receipt!.gasUsed) * BigInt(receipt!.gasPrice);
      
      // Check event
      await expect(tx)
        .to.emit(lynxMinter, "LynxBurned")
        .withArgs(userAddress, LYNX_AMOUNT, requiredHbar, requiredSauce, requiredClxy);
      
      // Check token balances
      expect(await mockHTS.balanceOf(lynxToken, userAddress)).to.equal(0n);
      expect(await mockHTS.balanceOf(sauceToken.target, userAddress)).to.equal(requiredSauce);
      expect(await mockHTS.balanceOf(clxyToken.target, userAddress)).to.equal(requiredClxy);
      
      // Check Ether balance (accounting for gas costs)
      const finalUserEthBalance = await ethers.provider.getBalance(userAddress);
      const expectedBalance = initialUserEthBalance + requiredHbar - gasCost;
      expect(finalUserEthBalance).to.equal(expectedBalance);
    });
    
    it("should revert if insufficient LYNX allowance", async function () {
      const insufficientAllowance = LYNX_AMOUNT - 1n;
      await mockHTS.setAllowance(
        lynxToken, 
        userAddress, 
        lynxMinter.target, 
        insufficientAllowance
      );
      
      await expect(
        lynxMinter.connect(user).burn(LYNX_AMOUNT)
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientLynxAllowance")
      .withArgs(insufficientAllowance, LYNX_AMOUNT);
    });
    
    it("should revert if contract doesn't have enough HBAR", async function () {
      // Remove HBAR from contract
      await admin.sendTransaction({
        to: adminAddress,
        value: await ethers.provider.getBalance(lynxMinter.target)
      });
      
      await expect(
        lynxMinter.connect(user).burn(LYNX_AMOUNT)
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientContractBalance");
    });
    
    it("should revert if contract doesn't have enough SAUCE", async function () {
      const requiredSauce = calculateRequiredAmount(LYNX_AMOUNT, SAUCE_RATIO);
      await mockHTS.setBalance(
        sauceToken.target, 
        lynxMinter.target, 
        requiredSauce - 1n
      );
      
      await expect(
        lynxMinter.connect(user).burn(LYNX_AMOUNT)
      ).to.be.revertedWithCustomError(lynxMinter, "InsufficientContractBalance");
    });
    
    it("should revert if trying to burn with amount 0", async function () {
      await expect(
        lynxMinter.connect(user).burn(0n)
      ).to.be.revertedWithCustomError(lynxMinter, "InvalidAmount");
    });
    
    it("should revert if contract doesn't have the supply key", async function () {
      // Remove supply key
      await lynxMinter.setSupplyKeyStatus(false);
      
      await expect(
        lynxMinter.connect(user).burn(LYNX_AMOUNT)
      ).to.be.revertedWithCustomError(lynxMinter, "NoSupplyKeyForToken");
    });
  });
  
  describe("Admin Functions", function () {
    it("should allow admin to update ratios", async function () {
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
        lynxMinter.connect(user).updateRatios(20n, 10n, 5n)
      ).to.be.revertedWithCustomError(lynxMinter, "OnlyAdmin");
    });
    
    it("should allow admin to set LYNX token ID", async function () {
      const mockLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHTS.mockIsSupplyKey(mockLynxAddress, lynxMinter.target, true);
      
      const tx = await lynxMinter.setLynxTokenId(mockLynxAddress);
      
      await expect(tx)
        .to.emit(lynxMinter, "LynxTokenSet")
        .withArgs(mockLynxAddress);
      
      expect(await lynxMinter.LYNX_TOKEN()).to.equal(mockLynxAddress);
      expect(await lynxMinter.hasSupplyKey()).to.equal(true);
    });
    
    it("should revert if LYNX token already set", async function () {
      const mockLynxAddress = "0x0000000000000000000000000000000000001234";
      await mockHTS.mockIsSupplyKey(mockLynxAddress, lynxMinter.target, true);
      await lynxMinter.setLynxTokenId(mockLynxAddress);
      
      await expect(
        lynxMinter.setLynxTokenId("0x0000000000000000000000000000000000005678")
      ).to.be.revertedWith("LYNX token already set");
    });
  });
  
  describe("Helper Functions", function () {
    it("should correctly calculate required HBAR", async function () {
      const result = await lynxMinter.calculateRequiredHBAR(LYNX_AMOUNT);
      expect(result).to.equal(LYNX_AMOUNT * HBAR_RATIO);
    });
    
    it("should correctly calculate required SAUCE", async function () {
      const result = await lynxMinter.calculateRequiredSAUCE(LYNX_AMOUNT);
      expect(result).to.equal(LYNX_AMOUNT * SAUCE_RATIO);
    });
    
    it("should correctly calculate required CLXY", async function () {
      const result = await lynxMinter.calculateRequiredCLXY(LYNX_AMOUNT);
      expect(result).to.equal(LYNX_AMOUNT * CLXY_RATIO);
    });
    
    it("should correctly check allowances", async function () {
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;
      
      // Set allowances
      await mockHTS.setAllowance(
        sauceToken.target, 
        userAddress, 
        lynxMinter.target, 
        requiredSauce
      );
      
      await mockHTS.setAllowance(
        clxyToken.target, 
        userAddress, 
        lynxMinter.target, 
        requiredClxy
      );
      
      const result = await lynxMinter.checkAllowances(userAddress, LYNX_AMOUNT);
      
      expect(result.sauceAllowance).to.equal(requiredSauce);
      expect(result.clxyAllowance).to.equal(requiredClxy);
      expect(result.sauceRequired).to.equal(requiredSauce);
      expect(result.clxyRequired).to.equal(requiredClxy);
      expect(result.isSauceAllowanceSufficient).to.equal(true);
      expect(result.isClxyAllowanceSufficient).to.equal(true);
    });
  });
});
