const { 
  Client, 
  AccountId, 
  PrivateKey,
  TokenId,
  ContractId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  Hbar
} = require("@hashgraph/sdk");
require('dotenv').config({ path: './.env.local' });

async function minimalSetToken() {
  console.log("===== MINIMAL TEST: SETTING LYNX TOKEN ID =====");
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
      !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
    throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, LYNX_TOKEN_ID');
  }

  // Setup client
  console.log("Setting up Hedera client...");
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  client.setOperator(operatorId, operatorKey);

  console.log("ENVIRONMENT VARIABLES:");
  console.log(`- NEXT_PUBLIC_OPERATOR_ID: ${process.env.NEXT_PUBLIC_OPERATOR_ID}`);
  console.log(`- LYNX_CONTRACT_ADDRESS: ${process.env.LYNX_CONTRACT_ADDRESS}`);
  console.log(`- LYNX_TOKEN_ID: ${process.env.LYNX_TOKEN_ID}`);
  
  const contractId = process.env.LYNX_CONTRACT_ADDRESS;
  const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
  
  try {
    // Verify the contract admin just to be safe
    console.log("\nSTEP 1: Verifying admin status...");
    const operatorEVMAddress = operatorId.toSolidityAddress();
    console.log(`- Operator EVM address: ${operatorEVMAddress}`);
    
    const adminQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("ADMIN");
    
    const adminResult = await adminQuery.execute(client);
    const adminAddress = adminResult.getAddress(0);
    console.log(`- ADMIN address: ${adminAddress}`);
    
    const isAdmin = adminAddress.toLowerCase() === operatorEVMAddress.toLowerCase();
    console.log(`- Is operator the ADMIN? ${isAdmin}`);
    
    if (!isAdmin) {
      throw new Error("Operator is not the contract ADMIN");
    }
    
    // Check if LYNX_TOKEN is zero address
    console.log("\nSTEP 2: Checking LYNX_TOKEN current value...");
    const tokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const tokenResult = await tokenQuery.execute(client);
    const currentTokenAddress = tokenResult.getAddress(0);
    console.log(`- Current LYNX_TOKEN address: ${currentTokenAddress}`);
    
    const isZeroAddress = currentTokenAddress === "0000000000000000000000000000000000000000";
    console.log(`- Is current LYNX_TOKEN zero address? ${isZeroAddress}`);
    
    if (!isZeroAddress) {
      console.warn("WARNING: LYNX_TOKEN is not a zero address. setLynxTokenId may fail due to the condition check.");
    }
    
    // Format the token ID for the contract function
    console.log("\nSTEP 3: Preparing token address for contract...");
    const tokenNum = parseInt(lynxTokenId.toString().split('.')[2]);
    const tokenHexString = tokenNum.toString(16);
    const tokenPaddedHex = tokenHexString.padStart(40, '0');
    const tokenFormattedAddress = `0x${tokenPaddedHex}`;
    console.log(`- LYNX token ID: ${lynxTokenId}`);
    console.log(`- Formatted for contract: ${tokenFormattedAddress}`);
    
    // Execute the setLynxTokenId function
    console.log("\nSTEP 4: Calling setLynxTokenId function...");
    const setTokenTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(1000000)
      .setFunction(
        "setLynxTokenId", 
        new ContractFunctionParameters().addAddress(tokenFormattedAddress)
      )
      .setMaxTransactionFee(new Hbar(10));
    
    console.log("- Executing transaction...");
    console.log("- Setting LYNX_TOKEN to:", tokenFormattedAddress);
    
    try {
      const setTokenResponse = await setTokenTx.execute(client);
      console.log("- Transaction executed, waiting for receipt...");
      
      const setTokenReceipt = await setTokenResponse.getReceipt(client);
      console.log(`- Transaction status: ${setTokenReceipt.status.toString()}`);
      
      // Verify the token was set
      console.log("\nSTEP 5: Verifying token was set correctly...");
      const verifyQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("LYNX_TOKEN");
      
      const verifyResult = await verifyQuery.execute(client);
      const newTokenAddress = verifyResult.getAddress(0);
      console.log(`- New LYNX_TOKEN address: ${newTokenAddress}`);
      
      const isSetCorrectly = newTokenAddress.toLowerCase() === tokenFormattedAddress.toLowerCase().replace('0x', '');
      console.log(`- Token set correctly? ${isSetCorrectly}`);
      
      // Update the supply key status
      console.log("\nSTEP 6: Updating supply key status...");
      const updateKeyTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("updateSupplyKeyStatus")
        .setMaxTransactionFee(new Hbar(10));
      
      const updateKeyResponse = await updateKeyTx.execute(client);
      const updateKeyReceipt = await updateKeyResponse.getReceipt(client);
      console.log(`- Update key status result: ${updateKeyReceipt.status.toString()}`);
      
      // Check supply key status
      const supplyKeyQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("hasSupplyKey");
      
      const supplyKeyResult = await supplyKeyQuery.execute(client);
      const hasSupplyKey = supplyKeyResult.getBool(0);
      console.log(`- Contract has supply key: ${hasSupplyKey}`);
      
      console.log("\n===== TEST COMPLETED SUCCESSFULLY =====");
    } catch (txError) {
      console.error("- Transaction failed with error:", txError.message);
      
      console.log("\nSTEP 5: Diagnosing the issue...");
      console.log("Checking contract code to see what might be wrong with the setLynxTokenId function.");
      console.log("Possible issues:");
      console.log("1. The setLynxTokenId function has additional requirements we're not meeting");
      console.log("2. The contract might have been compiled with a different Solidity version");
      console.log("3. There might be a gas limit issue");
      console.log("4. The function might be reverting for some other reason");
      
      console.log("\nPlease check the contract code for the exact implementation of setLynxTokenId.");
      
      throw txError;
    }
  } catch (error) {
    console.error("\nError during minimal test:", error);
    throw error;
  }
}

// Run the function
minimalSetToken()
  .then(() => {
    console.log("\nMinimal test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nMinimal test failed:", error.message);
    process.exit(1);
  }); 