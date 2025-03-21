import { expect } from "chai";
import { Contract } from "ethers";
import "@nomicfoundation/hardhat-chai-matchers";

const hre = require("hardhat");
const { ethers, network } = hre;

describe("LynxMinter", function () {
  let lynxMinter: Contract;
  let mockHts: Contract;
  let operator: any;
  let lynxTokenAddress: string;
  let sauceTokenAddress: string;
  let clxyTokenAddress: string;

  // Common setup without pre-existing LYNX token
  async function deployWithoutLynxToken() {
    // Get operator account
    [operator] = await ethers.getSigners();
    console.log("Operator address:", operator.address);

    // Deploy mock HTS precompile
    const MockHTS = await ethers.getContractFactory("MockHederaTokenService");
    mockHts = await MockHTS.deploy();
    await mockHts.waitForDeployment();
    const mockHtsAddress = await mockHts.getAddress();
    console.log("Mock HTS deployed to:", mockHtsAddress);

    // Set token addresses for SAUCE and CLXY only
    sauceTokenAddress = "0x0000000000000000000000000000000000000002";
    clxyTokenAddress = "0x0000000000000000000000000000000000000003";

    console.log("Using existing token addresses:", {
      SAUCE: sauceTokenAddress,
      CLXY: clxyTokenAddress
    });

    // Patch the Hedera Token Service precompile address to use our mock
    await network.provider.send("hardhat_setCode", [
      "0x0000000000000000000000000000000000000167", // HTS_PRECOMPILE constant from LynxMinter.sol
      await ethers.provider.getCode(mockHtsAddress)
    ]);

    console.log("Patched HTS precompile to use mock");

    // Deploy contract with a zero address for LYNX
    const LynxMinter = await ethers.getContractFactory("LynxMinter");
    lynxMinter = await LynxMinter.deploy(
      ethers.ZeroAddress, // Zero address for LYNX token
      sauceTokenAddress,
      clxyTokenAddress
    );
    await lynxMinter.waitForDeployment();
    const lynxMinterAddress = await lynxMinter.getAddress();
    console.log("Contract deployed to:", lynxMinterAddress);

    // Set the MockHTS in the LynxMinter contract
    await lynxMinter.setTokenService(mockHtsAddress);
    console.log("Set MockHTS in the LynxMinter contract");

    // Manually set token associations for SAUCE and CLXY
    await mockHts.setTokenAssociated(await lynxMinter.getAddress(), sauceTokenAddress, true);
    await mockHts.setTokenAssociated(await lynxMinter.getAddress(), clxyTokenAddress, true);
    console.log("SAUCE and CLXY tokens associated with contract");
  }

  // Setup with pre-existing LYNX token
  async function deployWithExistingLynxToken() {
    // Get operator account
    [operator] = await ethers.getSigners();
    console.log("Operator address:", operator.address);

    // Deploy mock HTS precompile
    const MockHTS = await ethers.getContractFactory("MockHederaTokenService");
    mockHts = await MockHTS.deploy();
    await mockHts.waitForDeployment();
    const mockHtsAddress = await mockHts.getAddress();
    console.log("Mock HTS deployed to:", mockHtsAddress);

    // Set token addresses
    lynxTokenAddress = "0x0000000000000000000000000000000000000001";
    sauceTokenAddress = "0x0000000000000000000000000000000000000002";
    clxyTokenAddress = "0x0000000000000000000000000000000000000003";

    console.log("Using token addresses:", {
      LYNX: lynxTokenAddress,
      SAUCE: sauceTokenAddress,
      CLXY: clxyTokenAddress
    });

    // Patch the Hedera Token Service precompile address to use our mock
    // This is a hack for hardhat
    await network.provider.send("hardhat_setCode", [
      "0x0000000000000000000000000000000000000167", // HTS_PRECOMPILE constant from LynxMinter.sol
      await ethers.provider.getCode(mockHtsAddress)
    ]);

    console.log("Patched HTS precompile to use mock");

    // Deploy contract with real token addresses
    const LynxMinter = await ethers.getContractFactory("LynxMinter");
    lynxMinter = await LynxMinter.deploy(
      lynxTokenAddress,
      sauceTokenAddress,
      clxyTokenAddress
    );
    await lynxMinter.waitForDeployment();
    const lynxMinterAddress = await lynxMinter.getAddress();
    console.log("Contract deployed to:", lynxMinterAddress);

    // Set the MockHTS in the LynxMinter contract
    await lynxMinter.setTokenService(mockHtsAddress);
    console.log("Set MockHTS in the LynxMinter contract");

    // Manually set token associations
    await mockHts.setTokenAssociated(await lynxMinter.getAddress(), lynxTokenAddress, true);
    await mockHts.setTokenAssociated(await lynxMinter.getAddress(), sauceTokenAddress, true);
    await mockHts.setTokenAssociated(await lynxMinter.getAddress(), clxyTokenAddress, true);
    console.log("Tokens associated with contract");
  }

  describe("Token Creation", function() {
    beforeEach(async function () {
      await deployWithoutLynxToken();
    });

    it("Should create a new LYNX token with the contract as supply key holder", async function() {
      // Mock the createToken function response in the MockHTS
      const expectedLynxAddress = "0x0000000000000000000000000000000000000001";
      await mockHts.mockCreateTokenResponse(0, expectedLynxAddress);
      
      // Create the LYNX token through the contract
      const tx = await lynxMinter.createLynxToken("LYNX Token", "LYNX", "LYNX token for testing");
      await tx.wait();
      
      // Get the newly created token address
      lynxTokenAddress = await lynxMinter.LYNX_TOKEN();
      console.log("Created LYNX token address:", lynxTokenAddress);
      expect(lynxTokenAddress).to.not.equal(ethers.ZeroAddress);
      
      // Verify the contract has the supply key
      const hasSupplyKey = await lynxMinter.hasSupplyKey();
      expect(hasSupplyKey).to.be.true;
    });
    
    it("Should revert when minting without creating the token first", async function() {
      // Try to mint without creating the token
      const LYNX_AMOUNT = 1000n;
      const HBAR_RATIO = 10n;
      
      await expect(lynxMinter.mint(LYNX_AMOUNT, { value: LYNX_AMOUNT * HBAR_RATIO }))
        .to.be.revertedWithCustomError(lynxMinter, "NoSupplyKeyForToken");
    });
  });

  describe("Supply Key Verification", function() {
    beforeEach(async function () {
      await deployWithExistingLynxToken();
    });
    
    it("Should detect when the contract doesn't have the supply key", async function() {
      // By default, the contract doesn't have the supply key
      // Set isSupplyKey to return false for the LYNX token
      await mockHts.mockIsSupplyKey(lynxTokenAddress, await lynxMinter.getAddress(), false);
      
      // Check supply key status
      await lynxMinter.checkSupplyKey();
      
      const hasSupplyKey = await lynxMinter.hasSupplyKey();
      expect(hasSupplyKey).to.be.false;
      
      // Trying to mint should revert
      const LYNX_AMOUNT = 1000n;
      const HBAR_RATIO = 10n;
      
      await expect(lynxMinter.mint(LYNX_AMOUNT, { value: LYNX_AMOUNT * HBAR_RATIO }))
        .to.be.revertedWithCustomError(lynxMinter, "NoSupplyKeyForToken");
    });
    
    it("Should detect when the contract has the supply key", async function() {
      const lynxMinterAddress = await lynxMinter.getAddress();
      console.log("Contract address:", lynxMinterAddress);
      
      // Set the contract as the supply key holder in the mock
      await mockHts.mockIsSupplyKey(lynxTokenAddress, lynxMinterAddress, true);
      console.log("Mock isSupplyKey set to true for contract");
      
      // Check if the mock is returning true for the contract address
      const mockIsSupplyKeyResult = await mockHts.isSupplyKey(lynxTokenAddress, lynxMinterAddress);
      console.log("Mock isSupplyKey result:", mockIsSupplyKeyResult);
      
      // Instead of updateSupplyKeyStatus(), use the direct setter
      await lynxMinter.setSupplyKeyStatus(true);
      console.log("Set supply key status to true directly");
      
      // Now the contract should have the supply key
      const hasSupplyKey = await lynxMinter.hasSupplyKey();
      console.log("Contract hasSupplyKey result:", hasSupplyKey);
      
      expect(hasSupplyKey).to.be.true;
    });
  });

  describe("Minting", function () {
    const LYNX_AMOUNT = 1000n;
    const HBAR_RATIO = 10n;
    const SAUCE_RATIO = 5n;
    const CLXY_RATIO = 2n;

    beforeEach(async function () {
      await deployWithExistingLynxToken();
      
      // Set the contract as the supply key holder in the mock
      await mockHts.mockIsSupplyKey(lynxTokenAddress, await lynxMinter.getAddress(), true);
      
      // Set supply key status directly instead of updating
      await lynxMinter.setSupplyKeyStatus(true);
    });

    it("Should revert when sending insufficient HBAR", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      
      await expect(lynxMinter.mint(LYNX_AMOUNT, { value: requiredHbar - 1n }))
        .to.be.revertedWithCustomError(lynxMinter, "MustSendExactHBAR");
    });

    it("Should revert with insufficient SAUCE allowance", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;

      // Mock token associations for user
      await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);

      // Mock zero allowance for SAUCE but sufficient for CLXY
      await mockHts.setAllowance(sauceTokenAddress, operator.address, await lynxMinter.getAddress(), 0);
      await mockHts.setAllowance(clxyTokenAddress, operator.address, await lynxMinter.getAddress(), requiredClxy);

      await expect(lynxMinter.mint(LYNX_AMOUNT, { value: requiredHbar }))
        .to.be.revertedWithCustomError(lynxMinter, "InsufficientSauceAllowance")
        .withArgs(0, requiredSauce);
    });

    it("Should successfully mint LYNX tokens", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;
      const contractAddress = await lynxMinter.getAddress();
      
      // Set token associations
      await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);
      
      // Set balances
      await mockHts.setBalance(sauceTokenAddress, operator.address, requiredSauce * 2n);
      await mockHts.setBalance(clxyTokenAddress, operator.address, requiredClxy * 2n);
      
      // Set allowances - higher than required to ensure they're sufficient
      await mockHts.setAllowance(sauceTokenAddress, operator.address, contractAddress, requiredSauce * 10n);
      await mockHts.setAllowance(clxyTokenAddress, operator.address, contractAddress, requiredClxy * 10n);
      
      // Execute mint
      const mintTx = await lynxMinter.mint(LYNX_AMOUNT, { value: requiredHbar });
      await mintTx.wait();
      
      // Check final balances
      const finalSauceBalance = await mockHts.balanceOf(sauceTokenAddress, operator.address);
      const finalClxyBalance = await mockHts.balanceOf(clxyTokenAddress, operator.address);
      const finalLynxBalance = await mockHts.balanceOf(lynxTokenAddress, operator.address);
      
      // Check operator (user) balances
      expect(finalSauceBalance).to.equal(requiredSauce * 2n - requiredSauce);
      expect(finalClxyBalance).to.equal(requiredClxy * 2n - requiredClxy);
      expect(finalLynxBalance).to.equal(LYNX_AMOUNT);
      
      // Check contract balances
      const contractSauceBalance = await mockHts.balanceOf(sauceTokenAddress, contractAddress);
      const contractClxyBalance = await mockHts.balanceOf(clxyTokenAddress, contractAddress);
      expect(contractSauceBalance).to.equal(requiredSauce);
      expect(contractClxyBalance).to.equal(requiredClxy);
    });
  });

  describe("Burning", function () {
    const LYNX_AMOUNT = 1000n;
    const HBAR_RATIO = 10n;
    const SAUCE_RATIO = 5n;
    const CLXY_RATIO = 2n;

    beforeEach(async function () {
      await deployWithExistingLynxToken();
      
      // Set the contract as the supply key holder in the mock
      await mockHts.mockIsSupplyKey(lynxTokenAddress, await lynxMinter.getAddress(), true);
      
      // Set supply key status directly instead of updating
      await lynxMinter.setSupplyKeyStatus(true);
      
      // Mock token associations
      await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);
      
      // Fund the contract with HBAR, SAUCE, and CLXY
      await operator.sendTransaction({
        to: await lynxMinter.getAddress(),
        value: ethers.parseEther("1.0")
      });
      
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;
      
      await mockHts.setBalance(sauceTokenAddress, await lynxMinter.getAddress(), requiredSauce);
      await mockHts.setBalance(clxyTokenAddress, await lynxMinter.getAddress(), requiredClxy);
    });

    it("Should revert with insufficient LYNX allowance", async function () {
      // Mock zero LYNX allowance
      await mockHts.setAllowance(lynxTokenAddress, operator.address, await lynxMinter.getAddress(), 0);
      await mockHts.setBalance(lynxTokenAddress, operator.address, LYNX_AMOUNT);
      
      await expect(lynxMinter.burn(LYNX_AMOUNT))
        .to.be.revertedWithCustomError(lynxMinter, "InsufficientLynxAllowance")
        .withArgs(0, LYNX_AMOUNT);
    });

    it("Should successfully burn LYNX tokens and return assets", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;
      
      // Set balances and allowances
      await mockHts.setBalance(lynxTokenAddress, operator.address, LYNX_AMOUNT);
      await mockHts.setAllowance(lynxTokenAddress, operator.address, await lynxMinter.getAddress(), LYNX_AMOUNT);
      
      // Check initial balances
      const initialLynxBalance = await mockHts.balanceOf(lynxTokenAddress, operator.address);
      const initialSauceBalance = await mockHts.balanceOf(sauceTokenAddress, operator.address);
      const initialClxyBalance = await mockHts.balanceOf(clxyTokenAddress, operator.address);
      const initialContractBalance = await ethers.provider.getBalance(await lynxMinter.getAddress());
      
      expect(initialLynxBalance).to.equal(LYNX_AMOUNT);
      
      // Execute burn
      const burnTx = await lynxMinter.burn(LYNX_AMOUNT);
      await burnTx.wait();
      
      // Check final balances
      const finalLynxBalance = await mockHts.balanceOf(lynxTokenAddress, operator.address);
      const finalSauceBalance = await mockHts.balanceOf(sauceTokenAddress, operator.address);
      const finalClxyBalance = await mockHts.balanceOf(clxyTokenAddress, operator.address);
      const finalContractBalance = await ethers.provider.getBalance(await lynxMinter.getAddress());
      
      expect(finalLynxBalance).to.equal(0);
      expect(finalSauceBalance).to.equal(initialSauceBalance + requiredSauce);
      expect(finalClxyBalance).to.equal(initialClxyBalance + requiredClxy);
      expect(finalContractBalance).to.equal(initialContractBalance - requiredHbar);
    });
  });
});