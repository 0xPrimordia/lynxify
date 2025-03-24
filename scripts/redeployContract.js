const { 
  Client, 
  AccountId, 
  PrivateKey, 
  FileCreateTransaction,
  ContractCreateTransaction,
  ContractFunctionParameters,
  Hbar,
  TokenId,
  ContractCallQuery
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

async function redeployContract() {
  console.log("===== REDEPLOYING LYNX MINTER CONTRACT =====");
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
      !process.env.LYNX_TOKEN_ID || !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID) {
    throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_TOKEN_ID, SAUCE_TOKEN_ID, CLXY_TOKEN_ID');
  }

  // Setup client
  console.log("Setting up Hedera client...");
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  client.setOperator(operatorId, operatorKey);

  console.log("ENVIRONMENT VARIABLES:");
  console.log(`- NEXT_PUBLIC_OPERATOR_ID: ${process.env.NEXT_PUBLIC_OPERATOR_ID}`);
  console.log(`- LYNX_TOKEN_ID: ${process.env.LYNX_TOKEN_ID}`);
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
    
    // Step 2: Calculate the properly formatted token address
    const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    const tokenIdNum = parseInt(lynxTokenId.toString().split('.')[2]);
    const hexString = tokenIdNum.toString(16);
    const paddedHex = hexString.padStart(40, '0');
    const formattedTokenAddress = `0x${paddedHex}`;
    
    console.log("\nSTEP 2: Token formatting");
    console.log(`- LYNX token ID: ${lynxTokenId}`);
    console.log(`- Formatted token address: ${formattedTokenAddress}`);
    
    // Step 3: Upload contract bytecode to Hedera
    console.log("\nSTEP 3: Uploading contract bytecode to Hedera...");
    const bytecodeFileId = await uploadBytecode(client, bytecode);
    console.log(`- Bytecode file ID: ${bytecodeFileId}`);
    
    // Step 4: Create the contract with the correct LYNX token ID
    console.log("\nSTEP 4: Creating contract with correct token ID...");
    
    // First get the operator's EVM address
    const operatorEVMAddress = operatorId.toSolidityAddress();
    console.log(`- Operator EVM address: ${operatorEVMAddress}`);
    
    // Convert other token IDs to addresses
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
    
    // Deploy the contract with constructor parameters
    const deployTransaction = new ContractCreateTransaction()
      .setGas(1000000)
      .setBytecodeFileId(bytecodeFileId)
      .setConstructorParameters(
        new ContractFunctionParameters()
          .addAddress(operatorEVMAddress) // Admin address
          .addAddress(formattedTokenAddress) // LYNX token address
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
    
    // Step 5: Verify the new contract is properly configured
    console.log("\nSTEP 5: Verifying contract configuration...");
    
    // Check the LYNX_TOKEN value
    const tokenQuery = new ContractCallQuery()
      .setContractId(newContractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const tokenResult = await tokenQuery.execute(client);
    const contractTokenAddress = tokenResult.getAddress(0);
    
    // Check the hasSupplyKey value
    const supplyKeyQuery = new ContractCallQuery()
      .setContractId(newContractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const supplyKeyResult = await supplyKeyQuery.execute(client);
    const hasSupplyKey = supplyKeyResult.getBool(0);
    
    console.log(`- LYNX_TOKEN in contract: ${contractTokenAddress}`);
    console.log(`- hasSupplyKey in contract: ${hasSupplyKey}`);
    
    // Check if the deployment was successful
    const isTokenAddressCorrect = contractTokenAddress.toLowerCase() === formattedTokenAddress.toLowerCase()
      || `0x${contractTokenAddress}`.toLowerCase() === formattedTokenAddress.toLowerCase();
    
    if (isTokenAddressCorrect) {
      console.log("✅ LYNX_TOKEN is correctly set in the contract!");
    } else {
      console.log("❌ LYNX_TOKEN is not correctly set in the contract.");
    }
    
    // Step 6: Update the .env.local file with the new contract ID
    console.log("\nSTEP 6: Updating .env.local file...");
    updateEnvFile(newContractId);
    
    console.log(`\n===== CONTRACT REDEPLOYMENT COMPLETED =====`);
    console.log(`New contract ID: ${newContractId}`);
    console.log(`Please update your environment and configuration files with this new contract ID.`);
    
  } catch (error) {
    console.error("Error during contract redeployment:", error);
    throw error;
  }
}

// Helper function to upload bytecode to Hedera
async function uploadBytecode(client, bytecode) {
  try {
    // First, write the bytecode to a temporary file
    const tempFilePath = path.join(__dirname, 'contract-bytecode.bin');
    fs.writeFileSync(tempFilePath, bytecode);
    
    // Read the bytecode as a buffer
    const fileContent = fs.readFileSync(tempFilePath);
    
    // Create a file on Hedera containing the bytecode
    const fileCreateTx = new FileCreateTransaction()
      .setKeys([client.operatorPublicKey])
      .setContents(fileContent)
      .setMaxTransactionFee(new Hbar(10))
      .freezeWith(client);
    
    const fileCreateSign = await fileCreateTx.sign(client.operatorPrivateKey);
    const fileCreateSubmit = await fileCreateSign.execute(client);
    const fileCreateRx = await fileCreateSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateRx.fileId;
    
    // Clean up the temporary file
    fs.unlinkSync(tempFilePath);
    
    return bytecodeFileId;
  } catch (error) {
    console.error("Error uploading bytecode:", error);
    throw error;
  }
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

// Run the function
redeployContract()
  .then(() => {
    console.log("\nContract redeployment completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nContract redeployment failed:", error);
    process.exit(1);
  }); 