const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractExecuteTransaction,
  ContractCallQuery,
  ContractFunctionParameters,
  Hbar
} = require("@hashgraph/sdk");
const fs = require('fs');
require('dotenv').config({ path: './.env.local' });

// Helper function to update the .env.local file with the new LYNX token ID
function updateEnvFile(newLynxTokenId) {
  try {
    const envFilePath = '.env.local';
    let envContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Update LYNX_TOKEN_ID
    const oldTokenMatch = envContent.match(/LYNX_TOKEN_ID=([^\r\n]*)/);
    const oldTokenValue = oldTokenMatch ? oldTokenMatch[1] : '';
    
    if (oldTokenValue) {
      // Keep the old token ID as a comment for reference
      envContent = envContent.replace(
        /LYNX_TOKEN_ID=([^\r\n]*)/,
        `LYNX_TOKEN_ID=${newLynxTokenId}\n# Previous token: ${oldTokenValue}`
      );
    } else {
      // Add the new token ID
      envContent += `\nLYNX_TOKEN_ID=${newLynxTokenId}`;
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(envFilePath, envContent);
    console.log(`- .env.local file updated with new LYNX token ID: ${newLynxTokenId}`);
    
  } catch (error) {
    console.error("Error updating .env.local file:", error);
    console.error("Please manually update your .env.local file with the new LYNX token ID:", newLynxTokenId);
  }
}

async function createLynxTokenDirectly() {
  console.log("===== CREATING LYNX TOKEN FROM EXISTING CONTRACT =====");
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS) {
    throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS');
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
  
  const contractId = process.env.LYNX_CONTRACT_ADDRESS;
  
  try {
    // Step 1: Verify the contract admin
    console.log("\nSTEP 1: Verifying contract admin...");
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
      console.error("ERROR: The operator account is not the ADMIN of the contract!");
      console.error("The createLynxToken function will fail with CONTRACT_REVERT_EXECUTED.");
      console.error("Please use the account that deployed the contract to run this script.");
      throw new Error("Operator is not the contract ADMIN");
    }
    
    // Step 2: Check if the contract already has a LYNX token
    console.log("\nSTEP 2: Checking if LYNX token already exists...");
    const tokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const tokenResult = await tokenQuery.execute(client);
    const lynxTokenAddress = tokenResult.getAddress(0);
    console.log(`- Current LYNX_TOKEN address: ${lynxTokenAddress}`);
    console.log(`- Address type: ${typeof lynxTokenAddress}`);
    console.log(`- Address length: ${lynxTokenAddress.length}`);
    console.log(`- Address as hex: 0x${Buffer.from(lynxTokenAddress).toString('hex')}`);
    
    let isZeroAddress = false;
    
    // Check if it's a typical zero address format
    if (lynxTokenAddress === "0x0000000000000000000000000000000000000000" || 
        lynxTokenAddress === "0000000000000000000000000000000000000000") {
        console.log("- Detected standard zero address format");
        isZeroAddress = true;
    } 
    // Check if all bytes are zero (for non-standard formats)
    else {
        const allZeros = Array.from(lynxTokenAddress).every(byte => byte === 0 || byte === '0');
        console.log(`- All zeros check: ${allZeros}`);
        if (allZeros) {
            isZeroAddress = true;
            console.log("- Detected non-standard zero address format (all bytes are zero)");
        }
    }
    
    console.log(`- Is zero address: ${isZeroAddress}`);
    
    if (!isZeroAddress) {
      console.log("WARNING: The contract already has a non-zero LYNX token set!");
      
      // Convert the token address to a token ID for reference
      const lynxTokenNum = parseInt(lynxTokenAddress.slice(2), 16);
      const lynxTokenId = `0.0.${lynxTokenNum}`;
      console.log(`- Existing LYNX token ID: ${lynxTokenId}`);
      
      // In this case, we will not proceed with token creation
      console.log("Since the token already exists, we'll just update the .env.local file with this value.");
      updateEnvFile(lynxTokenId);
      
      console.log(`\n===== USING EXISTING LYNX TOKEN =====`);
      console.log(`LYNX token ID: ${lynxTokenId}`);
      console.log(`No changes were made to the contract.`);
      
      return lynxTokenId;
    } else {
      console.log("- LYNX token is not set yet (zero address detected). Ready to create one!");
    }
    
    // Step 3: Associate the contract with SAUCE and CLXY tokens
    console.log("\nSTEP 3: Associating contract with tokens...");
    
    try {
      const associateTokensTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("associateTokens")
        .setMaxTransactionFee(new Hbar(10));
      
      const associateResponse = await associateTokensTx.execute(client);
      const associateReceipt = await associateResponse.getReceipt(client);
      console.log(`- Association result: ${associateReceipt.status.toString()}`);
    } catch (error) {
      console.log("- Association failed or tokens already associated, continuing...");
      console.log(`- Error details: ${error.message}`);
    }
    
    // Step 4: Create the LYNX token
    console.log("\nSTEP 4: Creating LYNX token from contract...");
    
    try {
      const createTokenTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(2000000)
        .setFunction("createLynxToken", 
          new ContractFunctionParameters()
            .addString("LYNX Token")
            .addString("LYNX")
            .addString("LYNX synthetic token by Lynx Protocol")
        )
        .setMaxTransactionFee(new Hbar(20));
      
      console.log("Executing createLynxToken transaction...");
      const createTokenResponse = await createTokenTx.execute(client);
      
      try {
        const createTokenReceipt = await createTokenResponse.getReceipt(client);
        console.log(`- Create token result: ${createTokenReceipt.status.toString()}`);
      } catch (receiptError) {
        console.error("- Error getting transaction receipt:", receiptError.message);
        console.log("- Transaction was submitted but may have failed. Let's check if the token was created anyway...");
      }
    } catch (txError) {
      console.error("- Error executing createLynxToken transaction:", txError.message);
      console.log("- Transaction execution failed completely.");
      throw txError;
    }
    
    // Step 5: Verify the new token was created
    console.log("\nSTEP 5: Verifying LYNX token creation...");
    
    const verifyTokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const verifyTokenResult = await verifyTokenQuery.execute(client);
    const newLynxTokenAddress = verifyTokenResult.getAddress(0);
    console.log(`- New LYNX_TOKEN address: ${newLynxTokenAddress}`);
    
    // Check the hasSupplyKey value
    const supplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const supplyKeyResult = await supplyKeyQuery.execute(client);
    const hasSupplyKey = supplyKeyResult.getBool(0);
    console.log(`- Contract has supply key: ${hasSupplyKey}`);
    
    // Convert the token address to a token ID
    const lynxTokenNum = parseInt(newLynxTokenAddress.slice(2), 16);
    const lynxTokenId = `0.0.${lynxTokenNum}`;
    console.log(`- LYNX token ID: ${lynxTokenId}`);
    
    // Step 6: Update the .env.local file with the new token ID
    console.log("\nSTEP 6: Updating .env.local file...");
    updateEnvFile(lynxTokenId);
    
    console.log(`\n===== LYNX TOKEN CREATION COMPLETED =====`);
    console.log(`LYNX token ID: ${lynxTokenId}`);
    console.log(`Please update your environment and configuration files with this new token ID.`);
    
    return lynxTokenId;
  } catch (error) {
    console.error("Error during LYNX token creation:", error);
    throw error;
  }
}

// Run the function
createLynxTokenDirectly()
  .then(() => {
    console.log("\nLYNX token creation completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nLYNX token creation failed:", error);
    process.exit(1);
  }); 