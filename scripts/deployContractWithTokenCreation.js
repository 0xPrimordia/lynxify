const { 
  Client, 
  AccountId, 
  PrivateKey, 
  FileCreateTransaction,
  ContractCreateTransaction,
  ContractFunctionParameters,
  ContractExecuteTransaction,
  ContractCallQuery,
  Hbar,
  TokenId
} = require("@hashgraph/sdk");
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env.local' });

// Ensure Hardhat is available
let hre;
try {
  hre = require('hardhat');
} catch (error) {
  console.error("Hardhat not found. Make sure you have it installed.");
  process.exit(1);
}

async function deployContractWithTokenCreation() {
  console.log("===== DEPLOYING LYNX MINTER CONTRACT WITH TOKEN CREATION =====");
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
      !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID) {
    throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, SAUCE_TOKEN_ID, CLXY_TOKEN_ID');
  }

  // Setup client
  console.log("Setting up Hedera client...");
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  client.setOperator(operatorId, operatorKey);

  console.log("ENVIRONMENT VARIABLES:");
  console.log(`- NEXT_PUBLIC_OPERATOR_ID: ${process.env.NEXT_PUBLIC_OPERATOR_ID}`);
  console.log(`- SAUCE_TOKEN_ID: ${process.env.SAUCE_TOKEN_ID}`);
  console.log(`- CLXY_TOKEN_ID: ${process.env.CLXY_TOKEN_ID}`);
  
  try {
    // Step 1: Compile the contract
    console.log("\nSTEP 1: Compiling contract...");
    await hre.run('compile');
    console.log("Compilation successful");
    
    // Get the contract bytecode
    const LynxMinterFactory = await hre.ethers.getContractFactory("LynxMinter");
    const bytecode = LynxMinterFactory.bytecode;
    console.log(`Contract bytecode size: ${bytecode.length / 2 - 1} bytes`);
    
    // Step 2: Calculate the properly formatted token addresses for SAUCE and CLXY
    console.log("\nSTEP 2: Formatting token addresses for constructor...");
    
    // First get the operator's EVM address
    const operatorEVMAddress = operatorId.toSolidityAddress();
    console.log(`- Operator EVM address: ${operatorEVMAddress}`);
    
    // Convert token IDs to addresses
    const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
    const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);
    
    const sauceTokenIdNum = parseInt(sauceTokenId.toString().split('.')[2]);
    const sauceHexString = sauceTokenIdNum.toString(16);
    const saucePaddedHex = sauceHexString.padStart(40, '0');
    const sauceFormattedAddress = `0x${saucePaddedHex}`;
    
    const clxyTokenIdNum = parseInt(clxyTokenId.toString().split('.')[2]);
    const clxyHexString = clxyTokenIdNum.toString(16);
    const clxyPaddedHex = clxyHexString.padStart(40, '0');
    const clxyFormattedAddress = `0x${clxyPaddedHex}`;
    
    console.log(`- SAUCE token address: ${sauceFormattedAddress}`);
    console.log(`- CLXY token address: ${clxyFormattedAddress}`);
    
    // Step 3: Upload contract bytecode to Hedera
    console.log("\nSTEP 3: Deploying contract with bytecode directly...");
    
    // Define zero address for LYNX token (to be created by the contract)
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    // Deploy the contract with constructor parameters
    const deployTransaction = new ContractCreateTransaction()
      .setGas(1000000)
      .setBytecode(bytecode)  // Send bytecode directly instead of using a file
      .setConstructorParameters(
        new ContractFunctionParameters()
          .addAddress(operatorEVMAddress) // Admin address as 1st parameter
          .addAddress(zeroAddress)       // LYNX token address as zero address
          .addAddress(sauceFormattedAddress) // SAUCE token address
          .addAddress(clxyFormattedAddress) // CLXY token address
      )
      .setMaxTransactionFee(new Hbar(20));

    console.log("Executing contract creation transaction...");
    const deployResponse = await deployTransaction.execute(client);
    console.log("Getting receipt...");
    const deployReceipt = await deployResponse.getReceipt(client);
    
    const newContractId = deployReceipt.contractId;
    console.log(`- New contract ID: ${newContractId}`);
    
    // Step 4: Associate contract with SAUCE and CLXY tokens
    console.log("\nSTEP 4: Associating contract with SAUCE and CLXY tokens...");
    
    // Use the associateTokens function to associate with all tokens
    console.log("Associating with tokens...");
    const associateTokensTx = new ContractExecuteTransaction()
      .setContractId(newContractId)
      .setGas(1000000)
      .setFunction("associateTokens")
      .setMaxTransactionFee(new Hbar(10));
    
    const associateTokensResponse = await associateTokensTx.execute(client);
    const associateTokensReceipt = await associateTokensResponse.getReceipt(client);
    console.log(`- Token association status: ${associateTokensReceipt.status}`);
    
    // Step 5: Create LYNX token from the contract
    console.log("\nSTEP 5: Creating LYNX token from contract...");
    
    const createTokenTx = new ContractExecuteTransaction()
      .setContractId(newContractId)
      .setGas(2000000)
      .setFunction("createLynxToken", 
        new ContractFunctionParameters()
          .addString("LYNX Token")  // Token name
          .addString("LYNX")        // Token symbol
          .addString("LYNX synthetic token by Lynx Protocol") // Token memo
      )
      .setMaxTransactionFee(new Hbar(20));
    
    console.log("Executing createLynxToken transaction...");
    const createTokenResponse = await createTokenTx.execute(client);
    const createTokenReceipt = await createTokenResponse.getReceipt(client);
    console.log(`- Create LYNX token status: ${createTokenReceipt.status}`);
    
    // Step 6: Verify the new token was created and properly configured
    console.log("\nSTEP 6: Verifying contract and token configuration...");
    
    // Get the LYNX token address from the contract
    const lynxTokenQuery = new ContractCallQuery()
      .setContractId(newContractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const lynxTokenResult = await lynxTokenQuery.execute(client);
    const lynxTokenAddress = lynxTokenResult.getAddress(0);
    console.log(`- LYNX_TOKEN in contract: ${lynxTokenAddress}`);
    
    // Check the hasSupplyKey value
    const hasSupplyKeyQuery = new ContractCallQuery()
      .setContractId(newContractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const hasSupplyKeyResult = await hasSupplyKeyQuery.execute(client);
    const hasSupplyKey = hasSupplyKeyResult.getBool(0);
    console.log(`- hasSupplyKey in contract: ${hasSupplyKey}`);
    
    // Convert the token address back to a token ID
    const lynxTokenNum = parseInt(lynxTokenAddress.slice(2), 16);
    const lynxTokenId = `0.0.${lynxTokenNum}`;
    console.log(`- Generated LYNX token ID: ${lynxTokenId}`);
    
    // Step 7: Update the .env.local file with the new contract ID and LYNX token ID
    console.log("\nSTEP 7: Updating .env.local file...");
    updateEnvFile(newContractId, lynxTokenId);
    
    console.log(`\n===== CONTRACT AND TOKEN DEPLOYMENT COMPLETED =====`);
    console.log(`New contract ID: ${newContractId}`);
    console.log(`New LYNX token ID: ${lynxTokenId}`);
    console.log(`Please update your environment and configuration files with these new IDs.`);
    
  } catch (error) {
    console.error("Error during contract and token deployment:", error);
    throw error;
  }
}

// Helper function to update the .env.local file with the new contract ID and LYNX token ID
function updateEnvFile(newContractId, newLynxTokenId) {
  try {
    const envFilePath = '.env.local';
    let envContent = fs.readFileSync(envFilePath, 'utf8');
    
    // Update LYNX_CONTRACT_ADDRESS
    const oldContractMatch = envContent.match(/LYNX_CONTRACT_ADDRESS=([^\r\n]*)/);
    const oldContractValue = oldContractMatch ? oldContractMatch[1] : '';
    
    if (oldContractValue) {
      // Keep the old contract as a comment for reference
      envContent = envContent.replace(
        /LYNX_CONTRACT_ADDRESS=([^\r\n]*)/,
        `LYNX_CONTRACT_ADDRESS=${newContractId}\n# Previous contract: ${oldContractValue}`
      );
    } else {
      // Add the new contract ID
      envContent += `\nLYNX_CONTRACT_ADDRESS=${newContractId}`;
    }
    
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
    console.log(`- .env.local file updated with new contract ID: ${newContractId}`);
    console.log(`- .env.local file updated with new LYNX token ID: ${newLynxTokenId}`);
    
  } catch (error) {
    console.error("Error updating .env.local file:", error);
    console.error("Please manually update your .env.local file with the new contract ID:", newContractId);
    console.error("and the new LYNX token ID:", newLynxTokenId);
  }
}

// Run the function
deployContractWithTokenCreation()
  .then(() => {
    console.log("\nContract and token deployment completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nContract and token deployment failed:", error);
    process.exit(1);
  }); 