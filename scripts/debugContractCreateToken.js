require('dotenv').config({ path: './.env.local' });
const {
  Client,
  AccountId,
  PrivateKey,
  ContractId,
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  Hbar,
  TransactionRecordQuery,
  Status,
  TransactionRecord
} = require("@hashgraph/sdk");

// Helper function to print contract call data from a record
function printContractCallDetails(record) {
  console.log("CONTRACT CALL DETAILS:");
  if (record && record.contractFunctionResult) {
    const result = record.contractFunctionResult;
    console.log("- Contract ID:", result.contractId.toString());
    console.log("- Gas Used:", result.gasUsed.toString());
    console.log("- Error Message:", result.errorMessage || "None");
    
    if (result.logs && result.logs.length > 0) {
      console.log("- Contract Logs:");
      result.logs.forEach((log, index) => {
        console.log(`  Log ${index + 1}:`, log);
      });
    } else {
      console.log("- Contract Logs: None");
    }
  } else {
    console.log("No contract function result available");
  }
}

async function debugContractCreateToken() {
  console.log("===== DEBUGGING LYNX TOKEN CREATION ISSUES =====");
  
  try {
    // Validate environment variables
    console.log("Environment variables:");
    console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
    
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS) {
      throw new Error("Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS");
    }
    
    // Setup client
    console.log("\nSTEP 1: Setting up client and contract ID...");
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);
    
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    console.log(`- Using contract ID: ${contractId.toString()}`);
    
    // Verify token addresses
    console.log("\nSTEP 2: Verifying contract token addresses...");
    const tokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getTokenAddresses");
    
    const tokenResult = await tokenQuery.execute(client);
    const lynxToken = tokenResult.getAddress(0);
    const sauceToken = tokenResult.getAddress(1);
    const clxyToken = tokenResult.getAddress(2);
    
    console.log(`- LYNX token address: ${lynxToken}`);
    console.log(`- SAUCE token address: ${sauceToken}`);
    console.log(`- CLXY token address: ${clxyToken}`);
    
    // Test the token creation with a very low gas limit to force a revert and get error
    console.log("\nSTEP 3: Testing token creation with invalid params to get error message...");
    const testCreateTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(7000000) // High gas limit to avoid gas-related issues
      .setFunction(
        "createLynxToken",
        new ContractFunctionParameters()
          .addString("LYNX Token") // Name
          .addString("LYNX")       // Symbol
          .addString("LYNX token for testing") // Memo
      );
      
    console.log("- Executing test transaction...");
    let txResponse;
    let record;
    
    try {
      txResponse = await testCreateTx.execute(client);
      console.log(`- Transaction ID: ${txResponse.transactionId.toString()}`);
      
      // Skip the getReceipt which will throw and go directly to record for debug info
      console.log("- Fetching transaction record to see detailed error...");
      record = await new TransactionRecordQuery()
        .setTransactionId(txResponse.transactionId)
        .execute(client);
      
      console.log(`- Transaction status: ${record.receipt.status}`);
    } catch (error) {
      console.error("- Transaction execution failed:", error.message);
      
      // Try to get the record even if execute or receipt failed
      if (txResponse) {
        try {
          console.log("- Attempting to get transaction record after failure...");
          record = await new TransactionRecordQuery()
            .setTransactionId(txResponse.transactionId)
            .execute(client);
        } catch (recordError) {
          console.error("- Failed to get transaction record:", recordError.message);
        }
      }
    }
    
    // Print detailed contract call info if we have a record
    if (record) {
      printContractCallDetails(record);
    }
    
    // Try alternative approach: check for requirements before calling
    console.log("\nSTEP 4: Testing internal function calls...");
    
    // Check if contract has the HTS precompile interface properly set
    console.log("- Checking HTS precompile interface...");
    const htsPrecompileQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("HTS_PRECOMPILE");
    
    const htsPrecompileResult = await htsPrecompileQuery.execute(client);
    const htsPrecompileAddress = htsPrecompileResult.getAddress(0);
    console.log(`- HTS precompile address: ${htsPrecompileAddress}`);
    
    if (htsPrecompileAddress !== "0000000000000000000000000000000000000167") {
      console.error("❌ HTS precompile address is incorrect! Should be 0x0000000000000000000000000000000000000167");
    }
    
    // Check if contract has admin permission
    console.log("- Checking contract admin permissions...");
    const adminQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("ADMIN");
    
    const adminResult = await adminQuery.execute(client);
    const adminAddress = adminResult.getAddress(0);
    const operatorAddress = operatorId.toSolidityAddress();
    console.log(`- Admin address: ${adminAddress}`);
    console.log(`- Operator address: ${operatorAddress}`);
    console.log(`- Is operator the admin? ${adminAddress.toLowerCase() === operatorAddress.toLowerCase()}`);
    
    // Summarize all findings
    console.log("\nSTEP 5: Summarizing findings and providing next steps...");
    
    console.log("\nDEBUG SUMMARY:");
    console.log("1. LYNX Token Status:", lynxToken === "0000000000000000000000000000000000000000" ? "Not created (zero address)" : "Already exists");
    console.log("2. Admin Check:", adminAddress.toLowerCase() === operatorAddress.toLowerCase() ? "✅ Operator is admin" : "❌ Operator is not admin");
    console.log("3. HTS Precompile:", htsPrecompileAddress === "0000000000000000000000000000000000000167" ? "✅ Correct address" : "❌ Incorrect address");
    console.log("4. Contract Error:", record && record.contractFunctionResult && record.contractFunctionResult.errorMessage ? 
      record.contractFunctionResult.errorMessage : "No specific error message available");
    
    console.log("\nRECOMMENDED NEXT STEPS:");
    if (lynxToken !== "0000000000000000000000000000000000000000") {
      console.log("- The LYNX token is already set in the contract. Use setLynxTokenId() instead of createLynxToken().");
    } else if (adminAddress.toLowerCase() !== operatorAddress.toLowerCase()) {
      console.log("- Use the account that is set as the ADMIN in the contract.");
    } else if (htsPrecompileAddress !== "0000000000000000000000000000000000000167") {
      console.log("- The HTS_PRECOMPILE address is incorrect. This may require redeploying the contract.");
    } else {
      console.log("- The most likely issue is with token creation in the contract, possibly related to:");
      console.log("  a) Hedera token service permissions");
      console.log("  b) Gas limits (try with even higher limits)");
      console.log("  c) Contract implementation issues");
      console.log("- Consider deploying the token externally and using setLynxTokenId() instead.");
    }
  } catch (error) {
    console.error("❌ Error in debug function:", error);
    console.error("Error message:", error.message);
  }
}

// Run the function
debugContractCreateToken()
  .then(() => {
    console.log("\n===== DEBUG PROCESS COMPLETED =====");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Debug process failed:", error.message || error);
    process.exit(1);
  }); 