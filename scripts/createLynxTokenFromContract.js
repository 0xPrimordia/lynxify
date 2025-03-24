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
  Status
} = require("@hashgraph/sdk");
const fs = require('fs').promises;
const path = require('path');

async function createLynxTokenFromContract() {
  console.log("===== CREATING LYNX TOKEN FROM CONTRACT =====");
  
  try {
    // Log all relevant environment variables
    console.log("Environment variables:");
    console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
    console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
    console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);

    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS) {
      throw new Error("Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS");
    }

    console.log("\nSTEP 1: Setting up client and verifying contract...");
    // Setup client
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    console.log(`- Using operator ID: ${operatorId.toString()}`);
    console.log(`- Using contract ID: ${contractId.toString()}`);
    
    // Step 2: Verify contract admin
    console.log("\nSTEP 2: Verifying contract admin...");
    const operatorEVMAddress = operatorId.toSolidityAddress();
    console.log(`- Operator EVM address: ${operatorEVMAddress}`);
    
    const adminQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("ADMIN");
    
    const adminResult = await adminQuery.execute(client);
    const adminAddress = adminResult.getAddress(0);
    console.log(`- ADMIN address: ${adminAddress}`);
    
    // Check if our operator is the ADMIN
    const isAdmin = adminAddress.toLowerCase() === operatorEVMAddress.toLowerCase();
    console.log(`- Operator is ADMIN: ${isAdmin}`);
    
    if (!isAdmin) {
      console.error("❌ ERROR: The operator account is not the ADMIN of the contract!");
      console.error("The createLynxToken function will fail with CONTRACT_REVERT_EXECUTED.");
      console.error("Please use the account that deployed the contract to run this script.");
      throw new Error("Operator is not the contract ADMIN");
    }
    
    // Step 3: Check if LYNX token already exists
    console.log("\nSTEP 3: Checking if LYNX token already exists...");
    const tokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const tokenResult = await tokenQuery.execute(client);
    const lynxTokenAddress = tokenResult.getAddress(0);
    console.log(`- Current LYNX_TOKEN address: ${lynxTokenAddress}`);
    
    // Check for zero address
    const isZeroAddress = lynxTokenAddress === "0000000000000000000000000000000000000000" || 
                         lynxTokenAddress === "0x0000000000000000000000000000000000000000";
    console.log(`- LYNX token is zero address: ${isZeroAddress}`);
    
    if (!isZeroAddress) {
      console.error("❌ ERROR: LYNX token already exists in the contract!");
      console.error("The createLynxToken function will fail with 'LYNX token already exists'.");
      throw new Error("LYNX token already exists");
    }
    
    // Step 4: Create the LYNX token from the contract
    console.log("\nSTEP 4: Creating LYNX token from contract...");
    const createTokenTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(5000000) // High gas limit
      .setFunction(
        "createLynxToken",
        new ContractFunctionParameters()
          .addString("LYNX Token") // Token name
          .addString("LYNX")       // Token symbol
          .addString("LYNX token for Lynxify platform") // Token memo
      )
      .setMaxTransactionFee(new Hbar(50)); // High fee limit
      
    console.log("- Executing transaction...");
    let txResponse;
    try {
      txResponse = await createTokenTx.execute(client);
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
          console.log("  1. The function call failed due to a require/revert in the contract");
          console.log("  2. Gas limit was too low");
          console.log("  3. The caller is not authorized");
        }
      } catch (recordError) {
        console.error("❌ Could not fetch transaction record:", recordError.message);
      }
      
      throw error;
    }
    
    // Step 5: Verify the token creation and get the new token ID
    console.log("\nSTEP 5: Verifying token creation...");
    
    // Check if token is created by querying the contract again
    const verifyTokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const verifyTokenResult = await verifyTokenQuery.execute(client);
    const newLynxTokenAddress = verifyTokenResult.getAddress(0);
    console.log(`- New LYNX_TOKEN address: ${newLynxTokenAddress}`);
    
    if (newLynxTokenAddress === "0000000000000000000000000000000000000000" || 
        newLynxTokenAddress === "0x0000000000000000000000000000000000000000") {
      console.error("❌ Token creation failed: LYNX_TOKEN is still zero address");
      throw new Error("Token creation failed");
    }
    
    // Convert the address to a token ID format (convert the Solidity address back to a token ID)
    console.log("- Converting token address to token ID format...");
    
    // Extract token ID from the address, should be in format 0x00000000000000000000000000000000TTTTTTTT
    // where TTTTTTTT is the hex representation of the token sequence number
    const tokenSeqHex = newLynxTokenAddress.substring(newLynxTokenAddress.length - 8);
    const tokenSeqNum = parseInt(tokenSeqHex, 16);
    const lynxTokenId = `0.0.${tokenSeqNum}`;
    console.log(`- Extracted LYNX token ID: ${lynxTokenId}`);
    
    // Step 6: Update the .env.local file with the new token ID
    console.log("\nSTEP 6: Updating .env.local file with the new token ID...");
    try {
      const envPath = path.resolve(process.cwd(), '.env.local');
      const envData = await fs.readFile(envPath, 'utf8');
      
      // Replace or add the LYNX_TOKEN_ID
      const updatedEnvData = envData.includes('LYNX_TOKEN_ID=') 
        ? envData.replace(/LYNX_TOKEN_ID=.*/g, `LYNX_TOKEN_ID=${lynxTokenId}`)
        : `${envData}\nLYNX_TOKEN_ID=${lynxTokenId}`;
      
      await fs.writeFile(envPath, updatedEnvData, 'utf8');
      console.log(`- Updated .env.local with LYNX_TOKEN_ID=${lynxTokenId}`);
    } catch (envError) {
      console.error("❌ Error updating .env.local file:", envError.message);
      console.log(`- Please manually add LYNX_TOKEN_ID=${lynxTokenId} to your .env.local file`);
    }
    
    console.log("\nSTEP 7: Verifying supply key status...");
    // Check if the contract has the supply key
    const supplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const supplyKeyResult = await supplyKeyQuery.execute(client);
    const hasSupplyKey = supplyKeyResult.getBool(0);
    console.log(`- Contract has supply key: ${hasSupplyKey}`);
    
    if (!hasSupplyKey) {
      console.warn("⚠️ WARNING: Contract does not have the supply key for the LYNX token!");
      console.warn("Minting and burning will not work until this is resolved.");
      console.warn("Try running the contract's checkSupplyKey() function.");
    }
    
    return {
      status: receipt.status.toString(),
      lynxTokenId
    };
  } catch (error) {
    console.error("❌ Error in createLynxTokenFromContract function:", error);
    console.error("Error message:", error.message);
    throw error;
  }
}

// Export the function for testing
module.exports = {
  createLynxTokenFromContract
};

// Run the function if this file is executed directly
if (require.main === module) {
  createLynxTokenFromContract()
    .then((result) => {
      console.log(`\n===== LYNX TOKEN CREATION ${result.status === 'SUCCESS' ? 'COMPLETED SUCCESSFULLY ✅' : 'FAILED ❌'} =====`);
      if (result.lynxTokenId) {
        console.log(`- New LYNX token ID: ${result.lynxTokenId}`);
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script execution failed:", error.message || error);
      process.exit(1);
    });
} 