require('dotenv').config({ path: './.env.local' });
const {
  Client,
  AccountId,
  PrivateKey,
  ContractId,
  ContractExecuteTransaction,
  ContractCallQuery,
  Hbar,
  TransactionRecordQuery,
  Status
} = require("@hashgraph/sdk");

async function associateTokens() {
  console.log("===== ASSOCIATING TOKENS WITH CONTRACT =====");
  
  try {
    // Log all relevant environment variables
    console.log("Environment variables:");
    console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
    console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
    console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
    console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID || "Not set (will use zero address in contract)");

    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS) {
      throw new Error("Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS");
    }

    if (!process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID) {
      console.warn("WARNING: SAUCE_TOKEN_ID or CLXY_TOKEN_ID not set. Association may fail for missing tokens.");
    }

    console.log("\nSTEP 1: Setting up client and verifying contract...");
    // Setup client
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    console.log(`- Using operator ID: ${operatorId.toString()}`);
    console.log(`- Using contract ID: ${contractId.toString()}`);
    
    // First verify contract addresses to confirm contract is accessible
    console.log("\nSTEP 2: Verifying contract token addresses...");
    const tokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getTokenAddresses");
    
    const tokenResult = await tokenQuery.execute(client);
    const lynxAddress = tokenResult.getAddress(0);
    const sauceAddress = tokenResult.getAddress(1);
    const clxyAddress = tokenResult.getAddress(2);
    console.log(`- Contract LYNX token address: ${lynxAddress}`);
    console.log(`- Contract SAUCE token address: ${sauceAddress}`);
    console.log(`- Contract CLXY token address: ${clxyAddress}`);
    
    // Step 3: Call the contract's associateTokens function with high gas
    console.log("\nSTEP 3: Calling contract's associateTokens function...");
    const associateTokensTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(5000000) // Significantly increased gas limit
      .setFunction("associateTokens")
      .setMaxTransactionFee(new Hbar(50)); // Increased max fee
      
    console.log("- Executing transaction...");
    let txResponse;
    try {
      txResponse = await associateTokensTx.execute(client);
      console.log(`- Transaction executed with ID: ${txResponse.transactionId.toString()}`);
    } catch (error) {
      console.error("❌ Error executing transaction:", error.message);
      throw error;
    }
    
    console.log("- Waiting for receipt...");
    let receipt;
    try {
      receipt = await txResponse.getReceipt(client);
      console.log(`- Receipt status: ${receipt.status.toString()}`);
    } catch (error) {
      console.error("❌ Error getting receipt:", error.message);
      
      // If receipt failed, try to get record for more details
      console.log("- Attempting to get transaction record for more details...");
      try {
        const record = await new TransactionRecordQuery()
          .setTransactionId(txResponse.transactionId)
          .execute(client);
          
        console.log(`- Transaction record status: ${record.receipt.status}`);
        if (record.receipt.status === Status.ContractRevertExecuted) {
          console.log("- CONTRACT_REVERT_EXECUTED error. This typically happens when:");
          console.log("  1. The contract execution failed");
          console.log("  2. Token is already associated");
          console.log("  3. The gas limit was too low");
          console.log("  4. A condition in the contract wasn't satisfied");
        }
      } catch (recordError) {
        console.error("❌ Could not fetch transaction record:", recordError.message);
      }
      
      throw error;
    }
    
    // Step 4: Verify if the tokens are now associated
    console.log("\nSTEP 4: Token association complete. Please verify in your application.");
    console.log(`- Attempted to associate contract ${contractId.toString()} with tokens.`);
    console.log(`- Receipt status: ${receipt.status.toString()}`);
    
    return receipt.status.toString();
  } catch (error) {
    console.error("❌ Error in associateTokens function:", error);
    console.error("Error message:", error.message);
    throw error;
  }
}

// Export the function for testing
module.exports = {
  associateTokens
};

// Run the function if this file is executed directly
if (require.main === module) {
  associateTokens()
    .then((status) => {
      console.log(`\n===== TOKEN ASSOCIATION ${status === 'SUCCESS' ? 'COMPLETED SUCCESSFULLY ✅' : 'FAILED ❌'} =====`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script execution failed:", error.message || error);
      process.exit(1);
    });
} 