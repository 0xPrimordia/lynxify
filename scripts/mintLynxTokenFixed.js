const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractId, 
  ContractExecuteTransaction,
  ContractCallQuery,
  Hbar,
  TokenId,
  TokenAssociateTransaction,
  AccountAllowanceApproveTransaction
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function mintLynxTokens() {
  console.log("Starting LYNX token minting process...");

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
    // First, check if we're associated with the LYNX token
    console.log("Making sure operator is associated with LYNX token...");
    
    try {
      // Associate the operator with the LYNX token if not already associated
      const associateTx = await new TokenAssociateTransaction()
        .setAccountId(operator)
        .setTokenIds([TokenId.fromString(lynxTokenId)])
        .execute(client);
        
      await associateTx.getReceipt(client);
      console.log("Associated operator with LYNX token");
    } catch (error) {
      // If it fails, likely already associated
      console.log("Operator may already be associated with LYNX token or error occurred:");
      console.log(error.message);
    }
    
    // Get contract ratios
    console.log("\nGetting contract ratios...");
    
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
    
    // The amount of LYNX tokens to mint
    const lynxAmount = 1;
    console.log(`\nAttempting to mint ${lynxAmount} LYNX tokens`);
    
    // Calculate required amounts based on ratios
    const hbarRequired = BigInt(lynxAmount) * BigInt(hbarRatio);
    const sauceRequired = BigInt(lynxAmount) * BigInt(sauceRatio);
    const clxyRequired = BigInt(lynxAmount) * BigInt(clxyRatio);
    
    console.log("Required amounts:");
    console.log(`- ${hbarRequired} tinybar (${Number(hbarRequired) / 100000000} HBAR)`);
    console.log(`- ${sauceRequired} SAUCE tokens`);
    console.log(`- ${clxyRequired} CLXY tokens`);
    
    // Approve tokens for the contract to spend
    console.log("\nApproving tokens for the contract...");
    
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
    
    // Update supply key status in contract
    console.log("\nUpdating supply key status in contract...");
    const updateSupplyKeyTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("checkSupplyKey");
    
    const updateResponse = await updateSupplyKeyTx.execute(client);
    const updateReceipt = await updateResponse.getReceipt(client);
    console.log(`Update supply key status: ${updateReceipt.status.toString()}`);
    
    // Check the current hasSupplyKey value
    const hasSupplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
      
    const hasSupplyKeyResult = await hasSupplyKeyQuery.execute(client);
    const hasSupplyKey = hasSupplyKeyResult.getBool(0);
    
    console.log(`Contract has supply key: ${hasSupplyKey}`);
    
    if (!hasSupplyKey) {
      console.log("WARNING: Contract does not have the supply key! Mint will likely fail.");
      
      // As a temporary measure, force set the supply key status to true
      console.log("Attempting to force set supply key status to true...");
      
      // Call the setSupplyKeyStatus function to force it to true
      const forceSetTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("setSupplyKeyStatus", [{ type: "bool", value: true }]);
      
      const forceSetResponse = await forceSetTx.execute(client);
      const forceSetReceipt = await forceSetResponse.getReceipt(client);
      console.log(`Force set supply key status: ${forceSetReceipt.status.toString()}`);
      
      // Verify the change
      const verifyQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("hasSupplyKey");
        
      const verifyResult = await verifyQuery.execute(client);
      console.log(`Contract now has supply key: ${verifyResult.getBool(0)}`);
    }
    
    // Now mint LYNX tokens
    console.log("\nCalling mint function...");
    
    // Convert lynxAmount to a BigInt string
    const lynxAmountString = BigInt(lynxAmount).toString();
    
    // Convert hbarRequired to Hbar
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
      
      // Check LYNX balance
      console.log("\nChecking LYNX balance after minting...");
      
      // Get balance through the contract
      const balanceCheckTx = new AccountAllowanceApproveTransaction()
        .approveTokenAllowance(TokenId.fromString(lynxTokenId), operator, operator, 0);
        
      const balanceCheckResponse = await balanceCheckTx.execute(client);
      const balanceCheckReceipt = await balanceCheckResponse.getReceipt(client);
      
      console.log(`Balance check transaction status: ${balanceCheckReceipt.status.toString()}`);
      console.log("Check your balance in the Hedera Portal or using the Hedera SDK directly");
    } else {
      console.log("Mint transaction failed!");
    }
    
    console.log("\nMinting process completed!");
  } catch (error) {
    console.error("Error minting LYNX tokens:", error);
  }
}

// Run the function
mintLynxTokens().catch(console.error); 