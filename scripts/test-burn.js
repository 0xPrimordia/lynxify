const { ethers } = require("hardhat");

async function main() {
  console.log("Starting burn test...");
  
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
  
  // Fund the contract
  console.log("Funding contract...");
  await operator.sendTransaction({
    to: lynxMinterAddress,
    value: requiredHbar * 2n
  });
  
  // Set contract token balances
  await mockHts.setBalance(sauceTokenAddress, lynxMinterAddress, requiredSauce * 2n);
  await mockHts.setBalance(clxyTokenAddress, lynxMinterAddress, requiredClxy * 2n);
  
  // Set user's LYNX balance and allowance
  console.log("Setting up LYNX balance and allowance for user...");
  await mockHts.setBalance(lynxTokenAddress, operator.address, LYNX_AMOUNT);
  await mockHts.setAllowance(lynxTokenAddress, operator.address, lynxMinterAddress, LYNX_AMOUNT);
  
  try {
    // Verify initial balances
    const initialLynxBalance = await mockHts.balanceOf(lynxTokenAddress, operator.address);
    const initialSauceBalance = await mockHts.balanceOf(sauceTokenAddress, operator.address);
    const initialClxyBalance = await mockHts.balanceOf(clxyTokenAddress, operator.address);
    const initialContractBalance = await ethers.provider.getBalance(lynxMinterAddress);
    
    console.log("Initial balances:", {
      LYNX: initialLynxBalance.toString(),
      SAUCE: initialSauceBalance.toString(),
      CLXY: initialClxyBalance.toString(),
      HBAR: initialContractBalance.toString()
    });
    
    // Execute burn
    console.log("Executing burn...");
    const burnTx = await lynxMinter.burn(LYNX_AMOUNT);
    await burnTx.wait();
    console.log("Burn transaction successful");
    
    // Check final balances
    const finalLynxBalance = await mockHts.balanceOf(lynxTokenAddress, operator.address);
    const finalSauceBalance = await mockHts.balanceOf(sauceTokenAddress, operator.address);
    const finalClxyBalance = await mockHts.balanceOf(clxyTokenAddress, operator.address);
    const finalContractBalance = await ethers.provider.getBalance(lynxMinterAddress);
    
    console.log("Final balances:", {
      LYNX: finalLynxBalance.toString(),
      SAUCE: finalSauceBalance.toString(),
      CLXY: finalClxyBalance.toString(),
      HBAR: finalContractBalance.toString()
    });
    
    console.log("Test completed successfully");
  } catch (error) {
    console.error("Error during burn transaction:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 