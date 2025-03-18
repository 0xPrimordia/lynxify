import { expect } from "chai";
import { Contract } from "ethers";
import "@nomicfoundation/hardhat-chai-matchers";

const hre = require("hardhat");
const { ethers } = hre;

describe("LynxMinter", function () {
  let lynxMinter: Contract;
  let mockHts: Contract;
  let operator: any;
  let lynxTokenAddress: string;
  let sauceTokenAddress: string;
  let clxyTokenAddress: string;

  beforeEach(async function () {
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
    // In test environment, we'll use mock addresses
    // In production, these will be replaced with actual token addresses
    lynxTokenAddress = "0x0000000000000000000000000000000000000001";
    sauceTokenAddress = "0x0000000000000000000000000000000000000002";
    clxyTokenAddress = "0x0000000000000000000000000000000000000003";

    console.log("Using token addresses:", {
      LYNX: lynxTokenAddress,
      SAUCE: sauceTokenAddress,
      CLXY: clxyTokenAddress
    });

    // Deploy contract
    const LynxMinter = await ethers.getContractFactory("LynxMinter");
    lynxMinter = await LynxMinter.deploy(
      lynxTokenAddress,
      sauceTokenAddress,
      clxyTokenAddress,
      mockHtsAddress
    );
    await lynxMinter.waitForDeployment();
    const lynxMinterAddress = await lynxMinter.getAddress();
    console.log("Contract deployed to:", lynxMinterAddress);

    // Associate tokens with the contract
    const associateTx = await lynxMinter.associateTokens();
    await associateTx.wait();
    console.log("Tokens associated with contract");
  });

  describe("Minting", function () {
    const LYNX_AMOUNT = 1000n;
    const HBAR_RATIO = 10n;
    const SAUCE_RATIO = 5n;
    const CLXY_RATIO = 2n;

    it("Should revert when sending insufficient HBAR", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      try {
        await lynxMinter.mint(LYNX_AMOUNT, { value: requiredHbar - 1n });
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientHBAR");
      }
    });

    it("Should revert with insufficient SAUCE allowance", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;

      // Mock token associations
      await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);

      // Mock zero allowance for SAUCE but sufficient for CLXY
      await mockHts.setAllowance(sauceTokenAddress, operator.address, await lynxMinter.getAddress(), 0);
      await mockHts.setAllowance(clxyTokenAddress, operator.address, await lynxMinter.getAddress(), requiredClxy);

      try {
        await lynxMinter.mint(LYNX_AMOUNT, { value: requiredHbar });
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientSauceAllowance");
      }
    });

    it("Should revert with insufficient CLXY allowance", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;

      // Mock token associations
      await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);

      // Mock allowances - sufficient SAUCE but zero CLXY
      await mockHts.setAllowance(sauceTokenAddress, operator.address, await lynxMinter.getAddress(), requiredSauce);
      await mockHts.setAllowance(clxyTokenAddress, operator.address, await lynxMinter.getAddress(), 0);

      try {
        await lynxMinter.mint(LYNX_AMOUNT, { value: requiredHbar });
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientClxyAllowance");
      }
    });

    it("Should successfully mint LYNX tokens", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;
      
      // Mock token associations
      await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);

      // Mock balances and allowances with required amounts
      await mockHts.setBalance(sauceTokenAddress, operator.address, requiredSauce);
      await mockHts.setBalance(clxyTokenAddress, operator.address, requiredClxy);
      await mockHts.setAllowance(sauceTokenAddress, operator.address, await lynxMinter.getAddress(), requiredSauce);
      await mockHts.setAllowance(clxyTokenAddress, operator.address, await lynxMinter.getAddress(), requiredClxy);

      // Get initial balances
      const initialSauceBalance = await mockHts.balanceOf(sauceTokenAddress, operator.address);
      const initialClxyBalance = await mockHts.balanceOf(clxyTokenAddress, operator.address);
      const initialLynxBalance = await mockHts.balanceOf(lynxTokenAddress, operator.address);
      const initialContractHbar = await ethers.provider.getBalance(await lynxMinter.getAddress());

      // Perform mint
      await expect(lynxMinter.mint(LYNX_AMOUNT, { value: requiredHbar }))
        .to.emit(lynxMinter, "LynxMinted")
        .withArgs(operator.address, LYNX_AMOUNT, requiredHbar, requiredSauce, requiredClxy);

      // Check final balances
      expect(await mockHts.balanceOf(sauceTokenAddress, operator.address)).to.equal(initialSauceBalance - requiredSauce);
      expect(await mockHts.balanceOf(clxyTokenAddress, operator.address)).to.equal(initialClxyBalance - requiredClxy);
      expect(await mockHts.balanceOf(lynxTokenAddress, operator.address)).to.equal(initialLynxBalance + LYNX_AMOUNT);
      expect(await ethers.provider.getBalance(await lynxMinter.getAddress())).to.equal(initialContractHbar + requiredHbar);
    });
  });

  describe("Burning", function () {
    const LYNX_AMOUNT = 1000n;
    const HBAR_RATIO = 10n;
    const SAUCE_RATIO = 5n;
    const CLXY_RATIO = 2n;

    it("Should revert when burning zero amount", async function () {
      try {
        await lynxMinter.burn(0n);
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("InvalidAmount");
      }
    });

    it("Should revert when burning more than balance", async function () {
      // Mock token associations
      await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);

      // Mock zero LYNX balance
      await mockHts.setBalance(lynxTokenAddress, operator.address, 0);

      try {
        await lynxMinter.burn(2000n);
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("InsufficientLynxBalance");
      }
    });

    it("Should successfully burn LYNX tokens", async function () {
      const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
      const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
      const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;
      
      // Mock token associations
      await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
      await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);

      // Mock balances with required amounts
      await mockHts.setBalance(lynxTokenAddress, operator.address, LYNX_AMOUNT);
      await mockHts.setBalance(sauceTokenAddress, await lynxMinter.getAddress(), requiredSauce);
      await mockHts.setBalance(clxyTokenAddress, await lynxMinter.getAddress(), requiredClxy);

      // Send HBAR to contract
      await operator.sendTransaction({
        to: await lynxMinter.getAddress(),
        value: requiredHbar
      });

      // Get initial balances
      const initialSauceBalance = await mockHts.balanceOf(sauceTokenAddress, operator.address);
      const initialClxyBalance = await mockHts.balanceOf(clxyTokenAddress, operator.address);
      const initialLynxBalance = await mockHts.balanceOf(lynxTokenAddress, operator.address);
      const initialOperatorHbar = await ethers.provider.getBalance(operator.address);

      // Perform burn
      const burnTx = await lynxMinter.burn(LYNX_AMOUNT);
      const burnReceipt = await burnTx.wait();
      const gasCost = burnReceipt.gasUsed * burnReceipt.gasPrice;

      // Check final balances
      expect(await mockHts.balanceOf(sauceTokenAddress, operator.address)).to.equal(initialSauceBalance + requiredSauce);
      expect(await mockHts.balanceOf(clxyTokenAddress, operator.address)).to.equal(initialClxyBalance + requiredClxy);
      expect(await mockHts.balanceOf(lynxTokenAddress, operator.address)).to.equal(initialLynxBalance - LYNX_AMOUNT);
      
      // Check HBAR balance (accounting for gas costs)
      const finalOperatorHbar = await ethers.provider.getBalance(operator.address);
      expect(finalOperatorHbar).to.equal(initialOperatorHbar + requiredHbar - gasCost);
    });
  });
});