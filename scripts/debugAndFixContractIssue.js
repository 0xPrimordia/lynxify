const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractId, 
  ContractCallQuery,
  ContractExecuteTransaction,
  TokenId,
  TokenInfoQuery,
  ContractFunctionParameters,
  Hbar
} = require("@hashgraph/sdk");
require('dotenv').config({ path: './.env.local' });

/**
 * This script diagnoses and fixes the issues with the LYNX contract:
 * 1. Checks if the contract's LYNX_TOKEN variable is properly set
 * 2. Checks if the hasSupplyKey flag is correctly set
 * 3. Attempts to fix any issues found
 */
async function debugAndFixContractIssue() {
  console.log("===== DEBUGGING AND FIXING CONTRACT ISSUE =====");
  
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
    // Step 1: Get LYNX token details
    console.log("\nSTEP 1: Getting LYNX token details");
    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(lynxTokenId)
      .execute(client);
    
    console.log(`- Name: ${tokenInfo.name}`);
    console.log(`- Symbol: ${tokenInfo.symbol}`);
    console.log(`- Supply: ${tokenInfo.totalSupply.toString()}`);
    console.log(`- Treasury: ${tokenInfo.treasuryAccountId?.toString()}`);
    console.log(`- Supply Key Present: ${tokenInfo.supplyKey ? "Yes" : "No"}`);
    console.log(`- Admin Key Present: ${tokenInfo.adminKey ? "Yes" : "No"}`);
    
    // Step 2: Check the contract's token state
    console.log("\nSTEP 2: Checking contract's token state");
    
    // Check LYNX_TOKEN variable
    const lynxTokenQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const lynxTokenResult = await lynxTokenQuery.execute(client);
    const contractLynxTokenAddress = lynxTokenResult.getAddress(0);
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    // Check hasSupplyKey variable
    const hasSupplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const hasSupplyKeyResult = await hasSupplyKeyQuery.execute(client);
    const contractHasSupplyKey = hasSupplyKeyResult.getBool(0);
    
    console.log(`- LYNX_TOKEN in contract: ${contractLynxTokenAddress}`);
    console.log(`- hasSupplyKey in contract: ${contractHasSupplyKey}`);
    
    // Convert lynxTokenId to the expected solidity address format
    const tokenIdNum = parseInt(lynxTokenId.toString().split('.')[2]);
    const hexString = tokenIdNum.toString(16);
    const paddedHex = hexString.padStart(40, '0');
    const expectedTokenAddress = `0x${paddedHex}`;
    
    console.log(`- Expected LYNX token address: ${expectedTokenAddress}`);
    
    // Analyze the state and determine what needs to be fixed
    // Format the contract address with 0x prefix for proper comparison with zeroAddress
    const formattedContractAddress = contractLynxTokenAddress.startsWith('0x') 
      ? contractLynxTokenAddress 
      : `0x${contractLynxTokenAddress}`;
    
    const isLynxTokenZero = formattedContractAddress === zeroAddress || 
                           contractLynxTokenAddress === '0000000000000000000000000000000000000000';
    const isLynxTokenCorrect = formattedContractAddress.toLowerCase() === expectedTokenAddress.toLowerCase();
    
    console.log("\nSTEP 3: Analysis");
    if (isLynxTokenZero) {
      console.log("- LYNX_TOKEN is set to the zero address");
      console.log("- We need to set it to the correct token address");
    } else if (isLynxTokenCorrect) {
      console.log("- LYNX_TOKEN is correctly set to the token address");
    } else {
      console.log("- LYNX_TOKEN is set to an incorrect address");
      console.log("- This means we need to redeploy the contract since the token can't be updated once set");
    }
    
    console.log(`- hasSupplyKey is ${contractHasSupplyKey ? "TRUE" : "FALSE"}`);
    if (!contractHasSupplyKey) {
      console.log("- We need to trigger the checkSupplyKey function to update this status");
    }
    
    // Step 4: Make any necessary fixes
    console.log("\nSTEP 4: Executing fixes");
    
    if (isLynxTokenZero) {
      console.log("Setting LYNX_TOKEN to the correct address...");
      try {
        const updateTx = new ContractExecuteTransaction()
          .setContractId(contractId)
          .setGas(1000000)
          .setFunction("setLynxTokenId", new ContractFunctionParameters().addAddress(expectedTokenAddress))
          .setMaxTransactionFee(new Hbar(10));
          
        const updateSubmit = await updateTx.execute(client);
        const updateRx = await updateSubmit.getReceipt(client);
        console.log(`- Result: ${updateRx.status.toString()}`);
        
        // Verify the change
        const verifyQuery = new ContractCallQuery()
          .setContractId(contractId)
          .setGas(100000)
          .setFunction("LYNX_TOKEN");
        
        const verifyResult = await verifyQuery.execute(client);
        const newTokenAddress = verifyResult.getAddress(0);
        
        console.log(`- New LYNX_TOKEN in contract: ${newTokenAddress}`);
        
        if (newTokenAddress.toLowerCase() === expectedTokenAddress.toLowerCase()) {
          console.log("- Successfully set LYNX_TOKEN address!");
        } else {
          console.log("- Failed to set LYNX_TOKEN address correctly.");
        }
      } catch (error) {
        console.error("- Error setting LYNX token address:", error.message);
      }
    } else if (!isLynxTokenCorrect) {
      console.log("- LYNX_TOKEN is set to an incorrect address and cannot be changed once set.");
      console.log("- Recommendation: Deploy a new contract with the correct token address.");
      return;
    }
    
    // Now call checkSupplyKey
    console.log("\nUpdating supply key status...");
    try {
      const checkSupplyKeyTx = new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("checkSupplyKey")
        .setMaxTransactionFee(new Hbar(5));
      
      const checkSupplyKeySubmit = await checkSupplyKeyTx.execute(client);
      const checkSupplyKeyRx = await checkSupplyKeySubmit.getReceipt(client);
      console.log(`- Result: ${checkSupplyKeyRx.status.toString()}`);
      
      // Verify the change
      const verifyQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("hasSupplyKey");
      
      const verifyResult = await verifyQuery.execute(client);
      const newHasSupplyKey = verifyResult.getBool(0);
      
      console.log(`- New hasSupplyKey in contract: ${newHasSupplyKey}`);
      
      if (newHasSupplyKey) {
        console.log("- Successfully updated hasSupplyKey status!");
      } else {
        console.log("- Failed to update hasSupplyKey status.");
        console.log("- This could indicate an issue with the token supply key assignment.");
      }
    } catch (error) {
      console.error("- Error updating supply key status:", error.message);
    }
    
    // Step 5: Final verification and recommendations
    console.log("\nSTEP 5: Final status");
    
    // Get the final state
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
    
    console.log(`- LYNX_TOKEN: ${finalLynxTokenAddress}`);
    console.log(`- hasSupplyKey: ${finalHasSupplyKey}`);
    
    if (finalLynxTokenAddress.toLowerCase() === expectedTokenAddress.toLowerCase() && finalHasSupplyKey) {
      console.log("\n✅ SUCCESS: Contract is correctly configured!");
      console.log("You can now use the mint() function to mint LYNX tokens.");
    } else {
      console.log("\n❌ ISSUE DETECTED: Contract is not correctly configured.");
      
      if (finalLynxTokenAddress.toLowerCase() !== expectedTokenAddress.toLowerCase()) {
        console.log("- LYNX_TOKEN address is not set correctly.");
        if (finalLynxTokenAddress === zeroAddress) {
          console.log("  Try running this script again to set it.");
        } else {
          console.log("  You will need to deploy a new contract since the token address cannot be changed once set.");
        }
      }
      
      if (!finalHasSupplyKey) {
        console.log("- hasSupplyKey is still false.");
        console.log("  The contract may not have the supply key for the token.");
        console.log("  Verify that the token was created with the contract as the supply key holder.");
      }
    }
    
  } catch (error) {
    console.error("Error during debugging:", error);
    throw error;
  }
}

// Run the debug function
debugAndFixContractIssue()
  .then(() => {
    console.log("\nDebug and fix process completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nDebug and fix process failed:", error);
    process.exit(1);
  }); 