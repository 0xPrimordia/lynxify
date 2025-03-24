const { 
  Client, 
  AccountId, 
  PrivateKey, 
  FileCreateTransaction,
  FileAppendTransaction,
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

async function redeployWithTokenCreation() {
  console.log("===== REDEPLOYING LYNX MINTER CONTRACT WITH TOKEN CREATION =====");
  
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
    
    // Step 3: Create the contract with zero address for LYNX token
    console.log("\nSTEP 3: Creating contract with zero address for LYNX token...");
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    // First create a file to store the bytecode
    console.log("- Creating a file to store the bytecode...");
    const fileCreateTx = new FileCreateTransaction()
      .setKeys([operatorKey])
      .setContents("")
      .setMaxTransactionFee(new Hbar(2));
      
    const fileSubmit = await fileCreateTx.execute(client);
    const fileCreateRx = await fileSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    console.log(`- File created with ID: ${bytecodeFileId}`);
    
    // Append the bytecode to the file
    console.log("- Appending bytecode to the file...");
    const fileAppendTx = new FileAppendTransaction()
      .setFileId(bytecodeFileId)
      .setContents(bytecode)
      .setMaxTransactionFee(new Hbar(2));
      
    const fileAppendSubmit = await fileAppendTx.execute(client);
    await fileAppendSubmit.getReceipt(client);
    console.log("- Bytecode appended successfully");
    
    // Deploy the contract with constructor parameters
    console.log("- Creating contract with the file...");
    const deployTransaction = new ContractCreateTransaction()
      .setGas(1000000)
      .setBytecodeFileId(bytecodeFileId)
      .setConstructorParameters(
        new ContractFunctionParameters()
          .addAddress(zeroAddress) // LYNX token address set to zero
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
    
    // Step 4: Associate tokens with the contract
    console.log("\nSTEP 4: Associating tokens with the contract...");
    
    // We need to get the HTS precompile address and call it directly
    const HTS_PRECOMPILE = "0x0000000000000000000000000000000000000167";
    
    console.log("- Associating SAUCE token...");
    const associateSauceTx = new ContractExecuteTransaction()
      .setContractId(newContractId)
      .setGas(300000)
      .setFunction("hts", 
        new ContractFunctionParameters()
          .addAddress(HTS_PRECOMPILE)
      );
    
    const associateSauceResponse = await associateSauceTx.execute(client);
    const associateSauceReceipt = await associateSauceResponse.getReceipt(client);
    console.log(`- Accessing HTS result: ${associateSauceReceipt.status.toString()}`);
    
    // Now try the original associateTokens function
    console.log("- Trying associateTokens function...");
    const associateTokensTx = new ContractExecuteTransaction()
      .setContractId(newContractId)
      .setGas(1000000)
      .setFunction("associateTokens")
      .setMaxTransactionFee(new Hbar(10));
    
    try {
      const associateResponse = await associateTokensTx.execute(client);
      const associateReceipt = await associateResponse.getReceipt(client);
      console.log(`- Association result: ${associateReceipt.status.toString()}`);
    } catch (error) {
      console.log("- Association failed, but continuing with token creation...");
      console.log(`- Error details: ${error.message}`);
    }
    
    // Step 5: Create LYNX token from the contract
    console.log("\nSTEP 5: Creating LYNX token from the contract...");
    
    // First check who is the ADMIN for verification
    console.log("- Checking ADMIN address...");
    const adminQuery = new ContractCallQuery()
      .setContractId(newContractId)
      .setGas(100000)
      .setFunction("ADMIN");
    
    const adminResult = await adminQuery.execute(client);
    const adminAddress = adminResult.getAddress(0);
    console.log(`- ADMIN address: ${adminAddress}`);
    
    // Check if our operator is the ADMIN
    console.log(`- Operator EVM address: ${operatorEVMAddress}`);
    const isAdmin = adminAddress.toLowerCase() === operatorEVMAddress.toLowerCase();
    console.log(`- Operator is ADMIN: ${isAdmin}`);
    
    if (!isAdmin) {
      console.log("WARNING: The operator account is not the ADMIN of the contract!");
      console.log("The createLynxToken function will likely fail with CONTRACT_REVERT_EXECUTED.");
    }
    
    // Create the LYNX token from the contract
    const createTokenTx = new ContractExecuteTransaction()
      .setContractId(newContractId)
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
    const createTokenReceipt = await createTokenResponse.getReceipt(client);
    console.log(`- Create token result: ${createTokenReceipt.status.toString()}`);
    
    // Step 6: Verify the new contract and token are properly configured
    console.log("\nSTEP 6: Verifying contract and token configuration...");
    
    // Check the LYNX_TOKEN value
    const tokenQuery = new ContractCallQuery()
      .setContractId(newContractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const tokenResult = await tokenQuery.execute(client);
    const lynxTokenAddress = tokenResult.getAddress(0);
    
    // Check the hasSupplyKey value
    const supplyKeyQuery = new ContractCallQuery()
      .setContractId(newContractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const supplyKeyResult = await supplyKeyQuery.execute(client);
    const hasSupplyKey = supplyKeyResult.getBool(0);
    
    console.log(`- LYNX_TOKEN in contract: ${lynxTokenAddress}`);
    console.log(`- hasSupplyKey in contract: ${hasSupplyKey}`);
    
    // Convert the token address back to a token ID
    const lynxTokenNum = parseInt(lynxTokenAddress.slice(2), 16);
    const lynxTokenId = `0.0.${lynxTokenNum}`;
    console.log(`- LYNX token ID: ${lynxTokenId}`);
    
    // Step 7: Update the .env.local file with the new contract ID and token ID
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

// Helper function to update the .env.local file with the new contract ID and token ID
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
redeployWithTokenCreation()
  .then(() => {
    console.log("\nContract and token deployment completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nContract and token deployment failed:", error);
    process.exit(1);
  }); 