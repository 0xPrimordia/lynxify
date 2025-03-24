const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractId, 
  ContractCallQuery,
  ContractExecuteTransaction,
  TokenId,
  ContractFunctionParameters,
  Hbar,
  Transaction,
  TransactionRecordQuery,
  AccountInfoQuery
} = require("@hashgraph/sdk");
require('dotenv').config({ path: './.env.local' });

async function debugSetLynxTokenId() {
  console.log("===== DEBUGGING setLynxTokenId FUNCTION =====");
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
      !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
    throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, LYNX_TOKEN_ID');
  }

  // Setup client
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  client.setOperator(operatorId, operatorKey);

  // Get contract and token IDs
  const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
  
  console.log("ENVIRONMENT VARIABLES:");
  console.log(`- NEXT_PUBLIC_OPERATOR_ID: ${process.env.NEXT_PUBLIC_OPERATOR_ID}`);
  console.log(`- LYNX_CONTRACT_ADDRESS: ${process.env.LYNX_CONTRACT_ADDRESS}`);
  console.log(`- LYNX_TOKEN_ID: ${process.env.LYNX_TOKEN_ID}`);
  
  try {
    // First check operator admin status
    console.log("\nVerifying operator is the admin for the contract...");
    const adminQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("ADMIN");
    
    const adminResult = await adminQuery.execute(client);
    const contractAdmin = adminResult.getAddress(0);
    
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(operatorId)
      .execute(client);
    
    const operatorSolidityAddress = accountInfo.contractAccountId;
    console.log(`- Contract admin: ${contractAdmin}`);
    console.log(`- Operator address: ${operatorSolidityAddress}`);
    
    const isAdmin = contractAdmin.toLowerCase() === operatorSolidityAddress.toLowerCase();
    
    if (!isAdmin) {
      console.log("⚠️ WARNING: The operator is NOT the admin of the contract");
      console.log("The setLynxTokenId function requires admin privileges");
      return;
    } else {
      console.log("✅ Operator is the admin of the contract");
    }
    
    // Get LYNX_TOKEN current value
    console.log("\nChecking current LYNX_TOKEN value...");
    const tokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const tokenResult = await tokenQuery.execute(client);
    const currentTokenAddress = tokenResult.getAddress(0);
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    console.log(`- Current LYNX_TOKEN address: ${currentTokenAddress}`);
    
    if (currentTokenAddress !== "0000000000000000000000000000000000000000") {
      console.log("⚠️ WARNING: LYNX_TOKEN is not the zero address");
      console.log("The setLynxTokenId function can only be called when LYNX_TOKEN is the zero address");
      return;
    } else {
      console.log("✅ LYNX_TOKEN is the zero address, we can set it");
    }
    
    // Format the token address properly
    const tokenIdNum = parseInt(lynxTokenId.toString().split('.')[2]);
    if (isNaN(tokenIdNum) || tokenIdNum === 0) {
      console.log("⚠️ ERROR: Invalid LYNX token ID format");
      return;
    }
    
    const hexString = tokenIdNum.toString(16);
    const paddedHex = hexString.padStart(40, '0');
    const formattedTokenAddress = `0x${paddedHex}`;
    
    console.log("\nToken address formatting:");
    console.log(`- LYNX token ID: ${lynxTokenId}`);
    console.log(`- Parsed numerical part: ${tokenIdNum}`);
    console.log(`- Hex representation: ${hexString}`);
    console.log(`- Padded hex (40 chars): ${paddedHex}`);
    console.log(`- Formatted token address: ${formattedTokenAddress}`);
    
    // Make sure the address is not zero
    if (formattedTokenAddress === zeroAddress) {
      console.log("⚠️ ERROR: Formatted token address would be the zero address");
      return;
    } else {
      console.log("✅ Formatted token address is not the zero address");
    }
    
    // Call setLynxTokenId with detailed debugging
    console.log("\nExecuting setLynxTokenId with detailed debugging...");
    try {
      console.log("Setting up transaction parameters...");
      const transaction = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)  // Increased gas limit
        .setFunction("setLynxTokenId", new ContractFunctionParameters().addAddress(formattedTokenAddress))
        .setMaxTransactionFee(new Hbar(10))
        .freezeWith(client);
      
      // Sign the transaction
      console.log("Signing transaction...");
      const signedTx = await transaction.sign(operatorKey);
      
      // Execute with detailed tracing
      console.log("Executing transaction...");
      const response = await signedTx.execute(client);
      
      console.log("Getting detailed record...");
      // Get a detailed record to see exactly what happened
      const record = await new TransactionRecordQuery()
        .setTransactionId(response.transactionId)
        .execute(client);
      
      // Log receipt status
      try {
        const receipt = await response.getReceipt(client);
        console.log(`Transaction receipt status: ${receipt.status.toString()}`);
      } catch (receiptError) {
        console.error("Error getting receipt:", receiptError.message);
      }
      
      console.log("\nTransaction record details:");
      console.log(`- Status: ${record.receipt.status.toString()}`);
      if (record.contractFunctionResult) {
        console.log("- Contract call result available");
        console.log(`  Gas used: ${record.contractFunctionResult.gasUsed}`);
        if (record.contractFunctionResult.errorMessage) {
          console.log(`  Error message: ${record.contractFunctionResult.errorMessage}`);
        }
      } else {
        console.log("- No contract function result available");
      }
      
      // Check if the LYNX_TOKEN was updated despite the error
      console.log("\nVerifying if LYNX_TOKEN was updated...");
      const verifyQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("LYNX_TOKEN");
      
      const verifyResult = await verifyQuery.execute(client);
      const newTokenAddress = verifyResult.getAddress(0);
      
      console.log(`- LYNX_TOKEN after transaction: ${newTokenAddress}`);
      
      if (newTokenAddress === "0000000000000000000000000000000000000000") {
        console.log("⚠️ LYNX_TOKEN is still the zero address - transaction failed");
      } else {
        console.log("✅ LYNX_TOKEN was updated successfully despite the error");
      }
      
    } catch (error) {
      console.error("Error executing setLynxTokenId:", error.message);
      
      // Try to get more details about the error
      if (error.transactionId) {
        try {
          console.log("\nAttempting to get detailed error information...");
          const errorRecord = await new TransactionRecordQuery()
            .setTransactionId(error.transactionId)
            .execute(client);
          
          console.log("Transaction record details from error:");
          console.log(`- Status: ${errorRecord.receipt.status.toString()}`);
          
          if (errorRecord.contractFunctionResult) {
            console.log(`- Gas used: ${errorRecord.contractFunctionResult.gasUsed}`);
            if (errorRecord.contractFunctionResult.errorMessage) {
              console.log(`- Error message: ${errorRecord.contractFunctionResult.errorMessage}`);
            }
          }
        } catch (recordError) {
          console.error("Could not get detailed error record:", recordError.message);
        }
      }
    }
    
    // Do one final check for the LYNX_TOKEN address
    const finalCheck = await new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN")
      .execute(client);
    
    const finalTokenAddress = finalCheck.getAddress(0);
    console.log(`\nFinal LYNX_TOKEN address: ${finalTokenAddress}`);
    
    if (finalTokenAddress === "0000000000000000000000000000000000000000") {
      console.log("\n❌ setLynxTokenId FAILED - LYNX_TOKEN is still the zero address");
      console.log("This might be due to one of the following issues:");
      console.log("1. The operator doesn't have admin privileges for the contract");
      console.log("2. The formatted token address isn't what the contract expects");
      console.log("3. There's a bug in the contract's setLynxTokenId function");
    } else {
      console.log("\n✅ setLynxTokenId SUCCEEDED - LYNX_TOKEN is now set");
    }
    
  } catch (error) {
    console.error("Error during debugging:", error);
    throw error;
  }
}

// Run the debug function
debugSetLynxTokenId()
  .then(() => {
    console.log("\nDebug process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nDebug process failed:", error);
    process.exit(1);
  }); 