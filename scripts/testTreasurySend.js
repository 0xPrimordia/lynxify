require('dotenv').config({ path: './.env.local' });
const {
  Client,
  AccountId,
  PrivateKey,
  ContractId,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  Hbar,
  ContractCallQuery
} = require("@hashgraph/sdk");

async function testTreasurySend() {
  console.log("Starting LYNX token mint test using treasury approach...");

  // Check required environment variables
  console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
  console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
  console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
  console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
  console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY ||
      !process.env.LYNX_CONTRACT_ADDRESS || !process.env.SAUCE_TOKEN_ID ||
      !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
    throw new Error("Missing required environment variables");
  }

  // Use the variables
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  const sauceTokenId = process.env.SAUCE_TOKEN_ID;
  const clxyTokenId = process.env.CLXY_TOKEN_ID;
  const lynxTokenId = process.env.LYNX_TOKEN_ID;
  
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
    
    // First, check if the treasury account (operator) has LYNX tokens
    console.log("Checking treasury LYNX balance...");
    const treasuryBalanceQuery = await new ContractCallQuery()
        .setContractId(ContractId.fromString(lynxTokenId))
        .setGas(100000)
        .setFunction(
            "balanceOf",
            new ContractFunctionParameters()
                .addAddress(operatorId.toSolidityAddress())
        )
        .execute(client);
    
    const treasuryBalance = treasuryBalanceQuery.getUint256(0);
    console.log(`Treasury LYNX balance: ${treasuryBalance.toString()} units (${Number(treasuryBalance) / (10 ** 8)} LYNX)`);
    
    if (treasuryBalance < lynxAmount) {
      console.error("Treasury does not have enough LYNX tokens to transfer");
      return;
    }
    
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
    
    // Finally, execute mint operation with higher gas limit
    console.log("Executing mint transaction...");
    const mintTransaction = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(8000000) // Increased gas limit significantly
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
        
        // Check user's LYNX balance after mint
        const userBalanceQuery = await new ContractCallQuery()
            .setContractId(ContractId.fromString(lynxTokenId))
            .setGas(100000)
            .setFunction(
                "balanceOf",
                new ContractFunctionParameters()
                    .addAddress(operatorId.toSolidityAddress())
            )
            .execute(client);
        
        const userBalance = userBalanceQuery.getUint256(0);
        console.log(`User LYNX balance after mint: ${userBalance.toString()} units (${Number(userBalance) / (10 ** 8)} LYNX)`);
    } else {
        console.error("Failed to mint LYNX tokens");
        
        // Try to get more info about the failure
        try {
            const record = await mintTransaction.getRecord(client);
            console.log("Transaction record:", JSON.stringify(record, null, 2));
        } catch (err) {
            console.error("Failed to get transaction record:", err.message);
        }
    }
  } catch (error) {
    console.error("Error during mint process:", error);
    console.error(error.stack);
  }
}

// Run the mint function
testTreasurySend()
  .then(() => {
    console.log("Test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  }); 