const { 
  Client, 
  AccountId, 
  PrivateKey, 
  FileCreateTransaction,
  FileAppendTransaction,
  ContractCreateTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  Hbar
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

// Helper function to update the .env.local file with the new contract ID
function updateEnvFile(newContractId) {
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
    
    // Write the updated content back to the file
    fs.writeFileSync(envFilePath, envContent);
    console.log(`- .env.local file updated with new contract ID: ${newContractId}`);
    
  } catch (error) {
    console.error("Error updating .env.local file:", error);
    console.error("Please manually update your .env.local file with the new contract ID:", newContractId);
  }
}

async function deployContractOnly() {
  console.log("===== DEPLOYING LYNX MINTER CONTRACT ONLY =====");
  
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
    const sauceTokenId = AccountId.fromString(process.env.SAUCE_TOKEN_ID);
    const clxyTokenId = AccountId.fromString(process.env.CLXY_TOKEN_ID);
    
    const sauceFormattedAddress = sauceTokenId.toSolidityAddress();
    const clxyFormattedAddress = clxyTokenId.toSolidityAddress();
    
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
    
    // Check who is the ADMIN
    console.log("\nSTEP 4: Verifying contract admin...");
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
    
    // Update .env.local file with the new contract ID
    console.log("\nSTEP 5: Updating .env.local file...");
    updateEnvFile(newContractId);
    
    console.log(`\n===== CONTRACT DEPLOYMENT COMPLETED =====`);
    console.log(`New contract ID: ${newContractId}`);
    console.log(`Please use this contract ID to create the LYNX token with:`);
    console.log(`node scripts/createLynxTokenDirectly.js`);
    
    return newContractId;
  } catch (error) {
    console.error("Error during contract deployment:", error);
    throw error;
  }
}

// Run the function
deployContractOnly()
  .then(() => {
    console.log("\nContract deployment completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nContract deployment failed:", error);
    process.exit(1);
  }); 