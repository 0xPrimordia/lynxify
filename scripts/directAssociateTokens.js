const { 
  Client, 
  AccountId, 
  PrivateKey,
  TokenId,
  ContractId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  TokenAssociateTransaction,
  Hbar,
  TransferTransaction
} = require("@hashgraph/sdk");
require('dotenv').config({ path: './.env.local' });

async function directAssociateTokens() {
  console.log("===== DIRECTLY ASSOCIATING CONTRACT WITH TOKENS =====");
  
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
    // Step 1: Check token associations
    console.log("\nSTEP 1: Checking if contract needs token associations...");
    const contractAsAccount = ContractId.fromString(contractId).toSolidityAddress();
    console.log(`- Contract as Solidity address: ${contractAsAccount}`);
    
    // Step 2: Try to associate tokens via the contract's function
    console.log("\nSTEP 2: Trying to associate via contract's associateTokens function...");
    try {
      const associateContractTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("associateTokens")
        .setMaxTransactionFee(new Hbar(10));
      
      console.log("- Executing associateTokens transaction...");
      const associateResponse = await associateContractTx.execute(client);
      const associateReceipt = await associateResponse.getReceipt(client);
      console.log(`- Association result: ${associateReceipt.status.toString()}`);
    } catch (error) {
      console.log("- Association via contract function failed, will try direct association...");
      console.log(`- Error details: ${error.message}`);
    }
    
    // Step 3: Try to set the LYNX token ID in the contract
    console.log("\nSTEP 3: Trying to set the LYNX token ID in the contract...");
    
    // Get the EVM address format for the token
    const tokenNum = parseInt(lynxTokenId.toString().split('.')[2]);
    const tokenHexString = tokenNum.toString(16);
    const tokenPaddedHex = tokenHexString.padStart(40, '0');
    const tokenFormattedAddress = `0x${tokenPaddedHex}`;
    console.log(`- Formatted token address: ${tokenFormattedAddress}`);
    
    try {
      const setTokenTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction(
          "setLynxTokenId", 
          new ContractFunctionParameters().addAddress(tokenFormattedAddress)
        )
        .setMaxTransactionFee(new Hbar(10));
      
      console.log("- Executing setLynxTokenId transaction...");
      const setTokenResponse = await setTokenTx.execute(client);
      const setTokenReceipt = await setTokenResponse.getReceipt(client);
      console.log(`- Set token result: ${setTokenReceipt.status.toString()}`);
    } catch (error) {
      console.error("- Error setting token ID in contract:", error.message);
    }
    
    // Step 4: Check the contract's LYNX token setting
    console.log("\nSTEP 4: Checking contract's token settings...");
    
    const tokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const tokenResult = await tokenQuery.execute(client);
    const storedTokenAddress = tokenResult.getAddress(0);
    console.log(`- LYNX_TOKEN in contract: ${storedTokenAddress}`);
    
    // Check if it matches our expected address
    const isCorrectToken = storedTokenAddress.toLowerCase() === tokenFormattedAddress.toLowerCase().replace('0x', '');
    console.log(`- Token set correctly in contract: ${isCorrectToken}`);
    
    // Check the hasSupplyKey value
    const supplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const supplyKeyResult = await supplyKeyQuery.execute(client);
    const hasSupplyKey = supplyKeyResult.getBool(0);
    console.log(`- Contract has supply key: ${hasSupplyKey}`);
    
    // Force update the supply key status if needed
    if (!hasSupplyKey) {
      console.log("\nSTEP 5: Trying to force update the supply key status...");
      try {
        const updateKeyStatusTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(1000000)
          .setFunction("updateSupplyKeyStatus")
          .setMaxTransactionFee(new Hbar(10));
        
        console.log("- Executing updateSupplyKeyStatus transaction...");
        const updateKeyResponse = await updateKeyStatusTx.execute(client);
        const updateKeyReceipt = await updateKeyResponse.getReceipt(client);
        console.log(`- Update key status result: ${updateKeyReceipt.status.toString()}`);
        
        // Check again
        const checkAgainQuery = new ContractCallQuery()
          .setContractId(contractId)
          .setGas(100000)
          .setFunction("hasSupplyKey");
        
        const checkAgainResult = await checkAgainQuery.execute(client);
        const hasKeyNow = checkAgainResult.getBool(0);
        console.log(`- Contract has supply key after update: ${hasKeyNow}`);
      } catch (error) {
        console.error("- Error updating supply key status:", error.message);
      }
    }
    
    console.log("\n===== TOKEN ASSOCIATION COMPLETED =====");
    console.log(`Attempted to associate contract ${contractId} with LYNX token ${lynxTokenId}`);
    console.log(`Please verify in your application if the association was successful.`);
  } catch (error) {
    console.error("Error during token association:", error);
    throw error;
  }
}

// Run the function
directAssociateTokens()
  .then(() => {
    console.log("\nToken association process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nToken association process failed:", error);
    process.exit(1);
  }); 