const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractId, 
  ContractExecuteTransaction,
  ContractCallQuery,
  Hbar,
  TokenId,
  AccountAllowanceApproveTransaction
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function forceSetAndMint() {
  console.log("Attempting to force set supply key status and mint LYNX tokens...");

  // Get environment variables
  const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const contractAddress = process.env.LYNX_CONTRACT_ADDRESS;
  const lynxTokenId = process.env.LYNX_TOKEN_ID;
  const sauceTokenId = process.env.SAUCE_TOKEN_ID;
  const clxyTokenId = process.env.CLXY_TOKEN_ID;

  if (!operatorId || !operatorKey || !contractAddress || !lynxTokenId || !sauceTokenId || !clxyTokenId) {
    console.error("Error: Missing required environment variables");
    return;
  }

  console.log("Environment variables:");
  console.log(`NEXT_PUBLIC_OPERATOR_ID: ${operatorId}`);
  console.log(`LYNX_CONTRACT_ADDRESS: ${contractAddress}`);
  console.log(`LYNX_TOKEN_ID: ${lynxTokenId}`);
  console.log(`SAUCE_TOKEN_ID: ${sauceTokenId}`);
  console.log(`CLXY_TOKEN_ID: ${clxyTokenId}`);
  
  // Initialize client
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
  
  // Create IDs
  const contractId = ContractId.fromString(contractAddress);
  const operator = AccountId.fromString(operatorId);
  
  try {
    // 1. Force set supply key status to true (admin only function)
    console.log("\nStep 1: Force setting supply key status to true...");
    const forceSetTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("setSupplyKeyStatus", [{ type: "bool", value: true }]);
    
    const forceSetResponse = await forceSetTx.execute(client);
    const forceSetReceipt = await forceSetResponse.getReceipt(client);
    console.log(`Force set transaction status: ${forceSetReceipt.status.toString()}`);
    
    // 2. Verify the change
    console.log("\nStep 2: Verifying supply key status...");
    const verifyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
      
    const verifyResult = await verifyQuery.execute(client);
    const hasSupplyKey = verifyResult.getBool(0);
    console.log(`Contract now has supply key: ${hasSupplyKey}`);
    
    if (!hasSupplyKey) {
      console.error("ERROR: Failed to set supply key status! Mint will fail.");
      return;
    }
    
    // 3. Get contract ratios
    console.log("\nStep 3: Getting contract ratios...");
    const hbarRatioQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getHbarRatio");
      
    const sauceRatioQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getSauceRatio");
      
    const clxyRatioQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getClxyRatio");
      
    const hbarRatioResult = await hbarRatioQuery.execute(client);
    const sauceRatioResult = await sauceRatioQuery.execute(client);
    const clxyRatioResult = await clxyRatioQuery.execute(client);
    
    const hbarRatio = hbarRatioResult.getUint256(0);
    const sauceRatio = sauceRatioResult.getUint256(0);
    const clxyRatio = clxyRatioResult.getUint256(0);
    
    console.log("Contract ratios:");
    console.log(`- HBAR Ratio: ${hbarRatio} tinybar per LYNX`);
    console.log(`- SAUCE Ratio: ${sauceRatio} SAUCE per LYNX`);
    console.log(`- CLXY Ratio: ${clxyRatio} CLXY per LYNX`);
    
    // 4. Calculate amounts for minting
    const lynxAmount = 1; // Start with just 1 token for testing
    console.log(`\nStep 4: Preparing to mint ${lynxAmount} LYNX tokens`);
    
    const hbarRequired = BigInt(lynxAmount) * BigInt(hbarRatio);
    const sauceRequired = BigInt(lynxAmount) * BigInt(sauceRatio);
    const clxyRequired = BigInt(lynxAmount) * BigInt(clxyRatio);
    
    console.log("Required amounts:");
    console.log(`- ${hbarRequired} tinybar (${Number(hbarRequired) / 100000000} HBAR)`);
    console.log(`- ${sauceRequired} SAUCE tokens`);
    console.log(`- ${clxyRequired} CLXY tokens`);
    
    // 5. Approve tokens for the contract to spend
    console.log("\nStep 5: Approving tokens for the contract...");
    const approveAllowanceTx = new AccountAllowanceApproveTransaction()
      .approveTokenAllowance(
        TokenId.fromString(sauceTokenId),
        operator,
        ContractId.fromString(contractAddress),
        Number(sauceRequired)
      )
      .approveTokenAllowance(
        TokenId.fromString(clxyTokenId),
        operator,
        ContractId.fromString(contractAddress),
        Number(clxyRequired)
      );
    
    const approveResponse = await approveAllowanceTx.execute(client);
    const approveReceipt = await approveResponse.getReceipt(client);
    console.log(`Token approval status: ${approveReceipt.status.toString()}`);
    
    // 6. Mint LYNX tokens
    console.log("\nStep 6: Calling mint function...");
    const lynxAmountString = BigInt(lynxAmount).toString();
    const hbarToSend = Hbar.fromTinybars(hbarRequired);
    
    console.log(`Sending ${hbarToSend.toString()} with mint function`);
    
    const mintTransaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(1000000)
      .setFunction("mint", [{ type: "uint256", value: lynxAmountString }])
      .setPayableAmount(hbarToSend);
    
    const mintResponse = await mintTransaction.execute(client);
    const mintReceipt = await mintResponse.getReceipt(client);
    
    console.log(`Mint transaction status: ${mintReceipt.status.toString()}`);
    
    if (mintReceipt.status.toString() === "SUCCESS") {
      console.log(`Successfully minted ${lynxAmount} LYNX tokens!`);
    } else {
      console.log("Mint transaction failed!");
    }
    
    console.log("\nProcess completed!");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the function
forceSetAndMint().catch(console.error); 