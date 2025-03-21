const { ethers } = require("hardhat");

async function main() {
  console.log("Starting mint test...");
  
  // Constants
  const LYNX_AMOUNT = 1000n;
  const HBAR_RATIO = 10n;
  const SAUCE_RATIO = 5n;
  const CLXY_RATIO = 2n;
  
  // Calculate required amounts
  const requiredHbar = LYNX_AMOUNT * HBAR_RATIO;
  const requiredSauce = LYNX_AMOUNT * SAUCE_RATIO;
  const requiredClxy = LYNX_AMOUNT * CLXY_RATIO;

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
  
  // Set token addresses
  const lynxTokenAddress = "0x0000000000000000000000000000000000000001";
  const sauceTokenAddress = "0x0000000000000000000000000000000000000002";
  const clxyTokenAddress = "0x0000000000000000000000000000000000000003";
  
  console.log("Using token addresses:", {
    LYNX: lynxTokenAddress,
    SAUCE: sauceTokenAddress,
    CLXY: clxyTokenAddress
  });
  
  // Patch the Hedera Token Service precompile address to use our mock
  await hre.network.provider.send("hardhat_setCode", [
    "0x0000000000000000000000000000000000000167", // HTS_PRECOMPILE constant
    await ethers.provider.getCode(mockHtsAddress)
  ]);
  console.log("Patched HTS precompile to use mock");
  
  // Deploy LynxMinter with pre-existing LYNX token
  console.log("Deploying LynxMinter...");
  const LynxMinter = await ethers.getContractFactory("LynxMinter");
  const lynxMinter = await LynxMinter.deploy(
    lynxTokenAddress,
    sauceTokenAddress,
    clxyTokenAddress
  );
  await lynxMinter.waitForDeployment();
  const lynxMinterAddress = await lynxMinter.getAddress();
  console.log("LynxMinter deployed to:", lynxMinterAddress);
  
  // Set the MockHTS in the LynxMinter contract
  console.log("Setting MockHTS in LynxMinter...");
  await lynxMinter.setTokenService(mockHtsAddress);
  
  // Set up token associations and supply key
  console.log("Setting up tokens...");
  await mockHts.setTokenAssociated(operator.address, lynxTokenAddress, true);
  await mockHts.setTokenAssociated(operator.address, sauceTokenAddress, true);
  await mockHts.setTokenAssociated(operator.address, clxyTokenAddress, true);
  await mockHts.setTokenAssociated(lynxMinterAddress, lynxTokenAddress, true);
  await mockHts.setTokenAssociated(lynxMinterAddress, sauceTokenAddress, true);
  await mockHts.setTokenAssociated(lynxMinterAddress, clxyTokenAddress, true);
  
  // Set the contract as the supply key holder
  await mockHts.mockIsSupplyKey(lynxTokenAddress, lynxMinterAddress, true);
  await lynxMinter.setSupplyKeyStatus(true);
  
  // Set up balances and allowances
  console.log("Setting up balances and allowances...");
  await mockHts.setBalance(sauceTokenAddress, operator.address, requiredSauce * 2n);
  await mockHts.setBalance(clxyTokenAddress, operator.address, requiredClxy * 2n);
  await mockHts.setSkipSauceAllowanceCheck(true);
  
  console.log("Setting allowances for:", lynxMinterAddress);
  await mockHts.setAllowance(sauceTokenAddress, operator.address, lynxMinterAddress, requiredSauce * 10n);
  await mockHts.setAllowance(clxyTokenAddress, operator.address, lynxMinterAddress, requiredClxy * 10n);
  
  // Verify allowances were set
  const sauceAllowance = await mockHts.allowance(sauceTokenAddress, operator.address, lynxMinterAddress);
  const clxyAllowance = await mockHts.allowance(clxyTokenAddress, operator.address, lynxMinterAddress);
  console.log("Mock HTS allowances:", {
    sauceAllowance: sauceAllowance.toString(),
    clxyAllowance: clxyAllowance.toString()
  });
  
  // Check allowances through LynxMinter
  const [contractSauceAllowance, contractClxyAllowance, contractLynxAllowance] = 
    await lynxMinter.debugAllowances(operator.address);
  console.log("LynxMinter sees allowances:", {
    sauceAllowance: contractSauceAllowance.toString(),
    clxyAllowance: contractClxyAllowance.toString(),
    lynxAllowance: contractLynxAllowance.toString()
  });
  
  try {
    // Execute mint
    console.log("Executing mint with HBAR:", requiredHbar.toString());
    const mintTx = await lynxMinter.mint(LYNX_AMOUNT, { value: requiredHbar });
    await mintTx.wait();
    console.log("Mint transaction successful");
    
    // Check final balances
    const finalSauceBalance = await mockHts.balanceOf(sauceTokenAddress, operator.address);
    const finalClxyBalance = await mockHts.balanceOf(clxyTokenAddress, operator.address);
    const finalLynxBalance = await mockHts.balanceOf(lynxTokenAddress, operator.address);
    
    console.log("Final balances:", {
      SAUCE: finalSauceBalance.toString(),
      CLXY: finalClxyBalance.toString(),
      LYNX: finalLynxBalance.toString()
    });
    
    // Check contract balances
    const contractSauceBalance = await mockHts.balanceOf(sauceTokenAddress, lynxMinterAddress);
    const contractClxyBalance = await mockHts.balanceOf(clxyTokenAddress, lynxMinterAddress);
    
    console.log("Contract balances:", {
      SAUCE: contractSauceBalance.toString(),
      CLXY: contractClxyBalance.toString()
    });
    
    console.log("Test completed successfully");
  } catch (error) {
    console.error("Error during mint transaction:", error.message);
    
    // Additional debugging info
    if (error.message.includes("InsufficientSauceAllowance")) {
      const sauceAllowance = await mockHts.allowance(sauceTokenAddress, operator.address, lynxMinterAddress);
      console.log("Current SAUCE allowance:", sauceAllowance.toString());
      console.log("Required SAUCE:", requiredSauce.toString());
    } else if (error.message.includes("InsufficientClxyAllowance")) {
      const clxyAllowance = await mockHts.allowance(clxyTokenAddress, operator.address, lynxMinterAddress);
      console.log("Current CLXY allowance:", clxyAllowance.toString());
      console.log("Required CLXY:", requiredClxy.toString());
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 