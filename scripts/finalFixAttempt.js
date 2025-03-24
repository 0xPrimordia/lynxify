const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractId, 
  ContractCallQuery,
  ContractExecuteTransaction,
  TokenId,
  ContractFunctionParameters,
  TokenAssociateTransaction,
  TokenInfoQuery,
  Hbar
} = require("@hashgraph/sdk");
require('dotenv').config({ path: './.env.local' });

async function finalFixAttempt() {
  console.log("===== FINAL FIX ATTEMPT =====");
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
      !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
    throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, LYNX_TOKEN_ID');
  }

  // Setup client
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  client.setOperator(operatorId, operatorKey);

  // Get contract and token IDs
  const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
  
  console.log("ENVIRONMENT VARIABLES:");
  console.log(`- NEXT_PUBLIC_OPERATOR_ID: ${process.env.NEXT_PUBLIC_OPERATOR_ID}`);
  console.log(`- LYNX_CONTRACT_ADDRESS: ${process.env.LYNX_CONTRACT_ADDRESS}`);
  console.log(`- LYNX_TOKEN_ID: ${process.env.LYNX_TOKEN_ID}`);
  
  try {
    // Step 1: Get LYNX token details to verify it exists
    console.log("\nSTEP 1: Verifying LYNX token details");
    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(lynxTokenId)
      .execute(client);
    
    console.log(`- Name: ${tokenInfo.name}`);
    console.log(`- Symbol: ${tokenInfo.symbol}`);
    console.log(`- Supply: ${tokenInfo.totalSupply.toString()}`);
    console.log(`- Treasury: ${tokenInfo.treasuryAccountId?.toString()}`);
    console.log(`- Supply Key Present: ${tokenInfo.supplyKey ? "Yes" : "No"}`);
    console.log(`- Admin Key Present: ${tokenInfo.adminKey ? "Yes" : "No"}`);
    
    // Step 2: Associate the LYNX token with the contract again
    console.log("\nSTEP 2: Re-associating the LYNX token with the contract");
    const contractAccountId = AccountId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    
    try {
      const associateTransaction = new TokenAssociateTransaction()
        .setAccountId(contractAccountId)
        .setTokenIds([lynxTokenId])
        .freezeWith(client);
      
      const signedTx = await associateTransaction.sign(operatorKey);
      const txResponse = await signedTx.execute(client);
      const receipt = await txResponse.getReceipt(client);
      
      console.log(`- Association status: ${receipt.status.toString()}`);
    } catch (error) {
      if (error.message && error.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
        console.log("- Token is already associated with the contract (this is good)");
      } else {
        console.error("- Error during token association:", error.message);
      }
    }
    
    // Step 3: Try a different approach to set the LYNX token ID
    // Use direct HTS precompile calls instead of the contract's function
    console.log("\nSTEP 3: Updating the contract's token ID using a different approach");
    
    // Format the token address
    const tokenIdNum = parseInt(lynxTokenId.toString().split('.')[2]);
    const hexString = tokenIdNum.toString(16);
    const paddedHex = hexString.padStart(40, '0');
    const formattedTokenAddress = `0x${paddedHex}`;
    
    console.log(`- LYNX token ID: ${lynxTokenId}`);
    console.log(`- Formatted token address: ${formattedTokenAddress}`);
    
    try {
      // Create a special transaction to force-set the LYNX_TOKEN
      console.log("\nAttempting to force-update the LYNX_TOKEN variable in the contract");
      
      // First check if it's truly zero
      const checkQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("LYNX_TOKEN");
      
      const checkResult = await checkQuery.execute(client);
      const currentTokenAddress = checkResult.getAddress(0);
      
      console.log(`- Current LYNX_TOKEN value: ${currentTokenAddress}`);
      
      if (currentTokenAddress === "0000000000000000000000000000000000000000") {
        console.log("- Current value is zero, attempting to set it");
        
        // Try the setLynxTokenId function one more time with higher gas
        const setLynxTokenIdTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(2000000) // Much higher gas limit
          .setFunction("setLynxTokenId", new ContractFunctionParameters().addAddress(formattedTokenAddress))
          .setMaxTransactionFee(new Hbar(20));
        
        try {
          const setLynxTokenIdResponse = await setLynxTokenIdTx.execute(client);
          const setLynxTokenIdReceipt = await setLynxTokenIdResponse.getReceipt(client);
          
          console.log(`- Set LYNX token ID status: ${setLynxTokenIdReceipt.status.toString()}`);
        } catch (error) {
          console.error("- Error setting LYNX token ID:", error.message);
          
          console.log("\nAttempting to update hasSupplyKey directly");
          
          // Try to update the hasSupplyKey directly
          const updateHasSupplyKeyTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(500000)
            .setFunction("updateSupplyKeyStatus") // This function should exist in the contract
            .setMaxTransactionFee(new Hbar(10));
          
          try {
            const updateResponse = await updateHasSupplyKeyTx.execute(client);
            const updateReceipt = await updateResponse.getReceipt(client);
            
            console.log(`- Update hasSupplyKey status: ${updateReceipt.status.toString()}`);
          } catch (error) {
            console.error("- Error updating hasSupplyKey:", error.message);
          }
        }
      } else {
        console.log("- LYNX_TOKEN is already set to a non-zero value, cannot update it");
      }
    } catch (error) {
      console.error("- Error during LYNX_TOKEN update:", error.message);
    }
    
    // Step 4: Check final contract state
    console.log("\nSTEP 4: Checking final contract state");
    
    const finalLynxTokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const finalHasSupplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const finalLynxTokenResult = await finalLynxTokenQuery.execute(client);
    const finalHasSupplyKeyResult = await finalHasSupplyKeyQuery.execute(client);
    
    const finalLynxTokenAddress = finalLynxTokenResult.getAddress(0);
    const finalHasSupplyKey = finalHasSupplyKeyResult.getBool(0);
    
    console.log(`- Final LYNX_TOKEN address: ${finalLynxTokenAddress}`);
    console.log(`- Final hasSupplyKey value: ${finalHasSupplyKey}`);
    
    // Final recommendations
    console.log("\nFINAL RECOMMENDATIONS:");
    if (finalLynxTokenAddress === "0000000000000000000000000000000000000000") {
      console.log("1. The contract's LYNX_TOKEN address is still zero after all attempts.");
      console.log("2. This is likely due to an issue with the contract's setLynxTokenId function.");
      console.log("3. The simplest solution is to redeploy the contract with the correct LYNX token ID.");
      console.log("4. You can use the Hardhat environment to deploy a new contract with the right token ID.");
    } else if (!finalHasSupplyKey) {
      console.log("1. The contract has the LYNX token ID set, but hasSupplyKey is still false.");
      console.log("2. This could be due to a permission issue with the token's supply key.");
      console.log("3. Verify that the token was created with the contract as the supply key holder.");
    } else {
      console.log("1. The contract appears to be correctly configured!");
      console.log("2. You should now be able to mint LYNX tokens using the contract.");
    }
    
  } catch (error) {
    console.error("Error during final fix attempt:", error);
    throw error;
  }
}

// Run the function
finalFixAttempt()
  .then(() => {
    console.log("\nFinal fix attempt completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nFinal fix attempt failed:", error);
    process.exit(1);
  }); 