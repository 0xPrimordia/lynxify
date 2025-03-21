// Script to debug the MockHederaTokenService's allowance functionality
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting debug script...");
  
  // Get signers
  const [operator] = await ethers.getSigners();
  console.log("Operator address:", operator.address);
  
  // Deploy MockHederaTokenService
  console.log("Deploying MockHederaTokenService...");
  const MockHTS = await ethers.getContractFactory("MockHederaTokenService");
  const mockHts = await MockHTS.deploy();
  await mockHts.waitForDeployment();
  const mockHtsAddress = await mockHts.getAddress();
  console.log("MockHTS deployed to:", mockHtsAddress);
  
  // Set test token addresses
  const sauceTokenAddress = "0x0000000000000000000000000000000000000002";
  const clxyTokenAddress = "0x0000000000000000000000000000000000000003";
  
  // Set up a mock spender address
  const spender = "0x1000000000000000000000000000000000000001";
  
  console.log("Setting up token associations...");
  await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
  await mockHts.setTokenAssociated(spender, sauceTokenAddress, true);
  
  // Test the allowance functionality
  console.log("Testing allowance functionality...");
  
  // Set and verify allowance
  const allowanceAmount = 1000n;
  console.log(`Setting allowance of ${allowanceAmount} for ${spender}...`);
  await mockHts.setAllowance(sauceTokenAddress, operator.address, spender, allowanceAmount);
  
  // Check allowance
  const allowance = await mockHts.allowance(sauceTokenAddress, operator.address, spender);
  console.log(`Current allowance: ${allowance}`);
  
  // Test the skipSauceAllowanceCheck flag
  console.log("Testing skipSauceAllowanceCheck flag...");
  
  // Set up balances for transfer
  const transferAmount = 500n;
  await mockHts.setBalance(sauceTokenAddress, operator.address, transferAmount * 2n);
  
  // Attempt transfer with insufficient allowance
  console.log(`Setting allowance to less than transfer amount (${transferAmount})...`);
  await mockHts.setAllowance(sauceTokenAddress, operator.address, mockHtsAddress, transferAmount - 100n);
  
  try {
    console.log("Attempting transfer with insufficient allowance...");
    await mockHts.transferToken(sauceTokenAddress, operator.address, spender, transferAmount);
    console.log("Transfer succeeded unexpectedly");
  } catch (error) {
    console.log("Transfer failed as expected:", error.message);
  }
  
  // Now try with skipSauceAllowanceCheck = true
  console.log("Setting skipSauceAllowanceCheck to true...");
  await mockHts.setSkipSauceAllowanceCheck(true);
  
  try {
    console.log("Attempting transfer with skipSauceAllowanceCheck = true...");
    await mockHts.transferToken(sauceTokenAddress, operator.address, spender, transferAmount);
    console.log("Transfer succeeded as expected");
    
    // Check balance after transfer
    const newBalance = await mockHts.balanceOf(sauceTokenAddress, spender);
    console.log(`New balance of spender: ${newBalance}`);
  } catch (error) {
    console.log("Transfer failed unexpectedly:", error.message);
  }
  
  console.log("Debug script completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 