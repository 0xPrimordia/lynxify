const {
  Client,
  AccountId,
  PrivateKey,
  ContractId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar
} = require('@hashgraph/sdk');
require('dotenv').config({ path: '.env.local' });

async function contractMint() {
  console.log("Starting LYNX token mint through contract...");

  // Use the variables we know are correct
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  const sauceTokenId = process.env.SAUCE_TOKEN_ID;
  const clxyTokenId = process.env.CLXY_TOKEN_ID;
  
  // Set up client
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  
  try {
    // Amount to mint (0.001 LYNX with 8 decimals = 100000 units)
    const lynxAmount = 0.001 * (10 ** 8);
    console.log(`Attempting to mint ${lynxAmount / (10 ** 8)} LYNX tokens...`);
    
    // Convert contract ID to Solidity address
    const contractAddress = contractId.toSolidityAddress();
    console.log("Contract Solidity address:", contractAddress);
    
    // Calculate required amounts based on token ratios in contract
    const hbarRatio = 10;
    const sauceRatio = 5;
    const clxyRatio = 2;
    
    const hbarRequired = lynxAmount * hbarRatio / (10 ** 8);
    const sauceRequired = lynxAmount * sauceRatio;
    const clxyRequired = lynxAmount * clxyRatio;
    
    console.log(`Requirements:`);
    console.log(`- HBAR: ${hbarRequired} (${lynxAmount * hbarRatio} tinybars)`);
    console.log(`- SAUCE: ${sauceRequired / (10 ** 8)} (${sauceRequired} units)`);
    console.log(`- CLXY: ${clxyRequired / (10 ** 8)} (${clxyRequired} units)`);
    
    // First, approve SAUCE tokens
    console.log("Approving SAUCE tokens...");
    const sauceApproveTransaction = await new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(sauceTokenId))
        .setGas(1000000)
        .setFunction(
            "approve",
            new ContractFunctionParameters()
                .addAddress(contractAddress)
                .addUint256(sauceRequired)
        )
        .execute(client);
        
    const sauceApproveReceipt = await sauceApproveTransaction.getReceipt(client);
    console.log("SAUCE approval status:", sauceApproveReceipt.status.toString());
    
    // Next, approve CLXY tokens
    console.log("Approving CLXY tokens...");
    const clxyApproveTransaction = await new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(clxyTokenId))
        .setGas(1000000)
        .setFunction(
            "approve",
            new ContractFunctionParameters()
                .addAddress(contractAddress)
                .addUint256(clxyRequired)
        )
        .execute(client);
        
    const clxyApproveReceipt = await clxyApproveTransaction.getReceipt(client);
    console.log("CLXY approval status:", clxyApproveReceipt.status.toString());
    
    // Finally, execute mint operation
    console.log("Executing mint transaction...");
    const mintTransaction = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(3000000)
        .setFunction(
            "mint",
            new ContractFunctionParameters()
                .addUint256(lynxAmount)
        )
        .setPayableAmount(new Hbar(hbarRequired))
        .execute(client);
        
    const mintReceipt = await mintTransaction.getReceipt(client);
    console.log("Mint status:", mintReceipt.status.toString());
    
    if (mintReceipt.status.toString() === "SUCCESS") {
        console.log(`Successfully minted ${lynxAmount / (10 ** 8)} LYNX tokens!`);
    } else {
        console.error("Failed to mint LYNX tokens");
    }
  } catch (error) {
    console.error("Error minting tokens through contract:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
  
  console.log("Script execution completed.");
}

// Execute the function
contractMint()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 