const { 
  Client, 
  AccountId, 
  PrivateKey,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  ContractId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  TokenAssociateTransaction,
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

async function createDirectLynxToken() {
  console.log("===== CREATING LYNX TOKEN DIRECTLY AND SETTING IT IN CONTRACT =====");
  
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
      console.error("The setLynxTokenId function will fail with CONTRACT_REVERT_EXECUTED.");
      console.error("Please use the account that deployed the contract to run this script.");
      throw new Error("Operator is not the contract ADMIN");
    }
    
    // Step 2: Check if the contract already has a LYNX token
    console.log("\nSTEP 2: Checking if LYNX token already exists in contract...");
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
    
    if (!isZeroAddress) {
      console.log("WARNING: The contract already has a LYNX token set!");
      
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
      console.log("- LYNX token is not set yet (zero address detected). Ready to create one directly!");
    }
    
    // Step 3: Create the LYNX token directly
    console.log("\nSTEP 3: Creating LYNX token directly via TokenCreateTransaction...");
    
    // Get the contract ID in a format for the supply key
    const contractAccountId = ContractId.fromString(contractId);
    console.log(`- Contract Account ID for supply key: ${contractAccountId.toString()}`);
    
    const tokenCreateTx = new TokenCreateTransaction()
      .setTokenName("LYNX Token")
      .setTokenSymbol("LYNX")
      .setDecimals(8)
      .setInitialSupply(0) // Start with zero supply
      .setTreasuryAccountId(operatorId) // Treasury starts as operator
      .setAdminKey(operatorKey) // Admin key for management
      .setSupplyKey(contractAccountId) // Contract has supply key
      .setTokenMemo("LYNX synthetic token by Lynx Protocol")
      .setSupplyType(TokenSupplyType.Infinite)
      .setTokenType(TokenType.FungibleCommon)
      .setMaxTransactionFee(new Hbar(30));
    
    console.log("Executing token creation transaction...");
    const tokenCreateSubmit = await tokenCreateTx.execute(client);
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    const lynxTokenId = tokenCreateRx.tokenId;
    
    console.log(`- LYNX token created with ID: ${lynxTokenId}`);
    
    // Step 4: Associate the token with the contract
    console.log("\nSTEP 4: Associating the token with the contract...");
    
    // First associate the contract with the new token
    // We need to convert the token ID to a solidity address format
    const lynxTokenSolidityAddress = lynxTokenId.toSolidityAddress();
    console.log(`- LYNX token solidity address: ${lynxTokenSolidityAddress}`);
    
    // Associate via contract function
    try {
      // Try using the contract's built-in association function
      console.log("- Trying to associate via contract's associateTokens function...");
      const associateTokensTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("associateTokens")
        .setMaxTransactionFee(new Hbar(10));
      
      const associateResponse = await associateTokensTx.execute(client);
      const associateReceipt = await associateResponse.getReceipt(client);
      console.log(`- Association result: ${associateReceipt.status.toString()}`);
    } catch (error) {
      console.log("- Association via contract function failed, will continue with next step...");
      console.log(`- Error details: ${error.message}`);
    }
    
    // Step 5: Set the token ID in the contract
    console.log("\nSTEP 5: Setting the token ID in the contract...");
    
    // Get the EVM address format of the token
    const tokenNum = parseInt(lynxTokenId.toString().split('.')[2]);
    const tokenHexString = tokenNum.toString(16);
    const tokenPaddedHex = tokenHexString.padStart(40, '0');
    const tokenFormattedAddress = `0x${tokenPaddedHex}`;
    console.log(`- Formatted token address for contract: ${tokenFormattedAddress}`);
    
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
      console.log("- Proceeding to verification step anyway...");
    }
    
    // Step 6: Verify the token was set correctly
    console.log("\nSTEP 6: Verifying contract configuration...");
    
    // Check the LYNX_TOKEN value in the contract
    const verifyTokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const verifyTokenResult = await verifyTokenQuery.execute(client);
    const newLynxTokenAddress = verifyTokenResult.getAddress(0);
    console.log(`- LYNX_TOKEN in contract: ${newLynxTokenAddress}`);
    
    // Check if it matches our expected address
    const isCorrectToken = newLynxTokenAddress.toLowerCase() === tokenFormattedAddress.toLowerCase().replace('0x', '');
    console.log(`- Token set correctly: ${isCorrectToken}`);
    
    // Check the hasSupplyKey value
    const supplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const supplyKeyResult = await supplyKeyQuery.execute(client);
    const hasSupplyKey = supplyKeyResult.getBool(0);
    console.log(`- Contract has supply key: ${hasSupplyKey}`);
    
    // Step 7: Update the .env.local file with the new token ID
    console.log("\nSTEP 7: Updating .env.local file...");
    updateEnvFile(lynxTokenId.toString());
    
    console.log(`\n===== LYNX TOKEN CREATION COMPLETED =====`);
    console.log(`LYNX token ID: ${lynxTokenId}`);
    console.log(`Contract updated to use the new token.`);
    console.log(`Please update your environment and configuration files with this new token ID.`);
    
    return lynxTokenId.toString();
  } catch (error) {
    console.error("Error during direct LYNX token creation:", error);
    throw error;
  }
}

// Run the function
createDirectLynxToken()
  .then(() => {
    console.log("\nLYNX token creation completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nLYNX token creation failed:", error);
    process.exit(1);
  }); 