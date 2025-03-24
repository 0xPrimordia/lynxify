const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractId, 
  ContractExecuteTransaction,
  TokenId,
  TokenInfoQuery,
  TokenUpdateTransaction
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function fixSupplyKeyIssue() {
  console.log("Diagnosing and fixing LYNX token supply key issue...");

  // Get environment variables
  const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const contractAddress = process.env.LYNX_CONTRACT_ADDRESS;
  const lynxTokenId = process.env.LYNX_TOKEN_ID;

  if (!operatorId || !operatorKey || !contractAddress || !lynxTokenId) {
    console.error("Error: Missing required environment variables");
    return;
  }

  console.log("Environment variables:");
  console.log(`NEXT_PUBLIC_OPERATOR_ID: ${operatorId}`);
  console.log(`LYNX_CONTRACT_ADDRESS: ${contractAddress}`);
  console.log(`LYNX_TOKEN_ID: ${lynxTokenId}`);
  
  // Initialize client
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
  
  // Create IDs
  const contractId = ContractId.fromString(contractAddress);
  const operator = AccountId.fromString(operatorId);
  const tokenId = TokenId.fromString(lynxTokenId);
  
  try {
    // 1. Get detailed token information
    console.log("\nStep 1: Checking LYNX token information...");
    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(tokenId)
      .execute(client);
    
    console.log("LYNX Token Info:");
    console.log(`Name: ${tokenInfo.name}`);
    console.log(`Symbol: ${tokenInfo.symbol}`);
    console.log(`Supply: ${tokenInfo.totalSupply.toString()}`);
    console.log(`Treasury: ${tokenInfo.treasuryAccountId?.toString()}`);
    console.log(`Admin Key Present: ${tokenInfo.adminKey ? "Yes" : "No"}`);
    console.log(`Supply Key Present: ${tokenInfo.supplyKey ? "Yes" : "No"}`);
    
    // 2. Check mirror node for more details about supply key
    console.log("\nStep 2: Fetching detailed token info from mirror node...");
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/tokens/${lynxTokenId}`
    );
    
    if (!response.ok) {
      console.error("Error fetching token info from mirror node:", response.statusText);
      return;
    }
    
    const tokenData = await response.json();
    
    if (tokenData.supply_key && tokenData.supply_key.key) {
      console.log("\nSupply Key Details from Mirror Node:");
      console.log(`Supply Key: ${tokenData.supply_key.key}`);
      console.log(`Supply Key Type: ${tokenData.supply_key._type}`);
    }
    
    // 3. Fetch contract info to compare
    console.log("\nStep 3: Fetching contract info from mirror node...");
    const contractResponse = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/contracts/${contractAddress}`
    );
    
    if (!contractResponse.ok) {
      console.error("Error fetching contract info:", contractResponse.statusText);
      return;
    }
    
    const contractData = await contractResponse.json();
    console.log("Contract Info:");
    console.log(`Contract ID: ${contractData.contract_id}`);
    console.log(`EVM Address: ${contractData.evm_address}`);
    
    // 4. Compare supply key ownership
    console.log("\nStep 4: Analyzing supply key configuration...");
    
    // 5. Call the contract's checkSupplyKey function to update the status
    console.log("\nStep 5: Calling contract's checkSupplyKey function...");
    const checkSupplyKeyTx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("checkSupplyKey");
    
    const checkSupplyKeyResponse = await checkSupplyKeyTx.execute(client);
    const checkSupplyKeyReceipt = await checkSupplyKeyResponse.getReceipt(client);
    console.log(`checkSupplyKey transaction status: ${checkSupplyKeyReceipt.status.toString()}`);
    
    // 6. Fix the token configuration if needed
    console.log("\nStep 6: Determining if token supply key needs to be fixed...");
    
    let needsUpdate = false;
    
    if (tokenData.supply_key && tokenData.supply_key._type === "ProtobufEncoded") {
      console.log("The supply key is in protobuf format, which is expected for a contract.");
      console.log("The contract should be able to mint tokens if properly configured.");
      
      if (tokenInfo.treasuryAccountId?.toString() !== contractAddress) {
        console.log("\nWARNING: The token treasury is not set to the contract address.");
        console.log("This may cause issues when minting tokens.");
      }
      
      // Fetch contract token address configuration
      console.log("\nChecking contract configuration for token address...");
      // We'll analyze how we can proceed from here based on token setup
      console.log("\nAnalysis and Recommendations:");
      
      if (tokenInfo.adminKey) {
        console.log("1. The token has an admin key, which means we can update the supply key if needed.");
        console.log("2. Contract should verify it has the supply key using HTS isSupplyKey function");
        console.log("3. Contract LYNX_TOKEN variable should be set to the correct token address");
        
        console.log("\nRecommended Actions:");
        console.log("- Run updateContractTokenId.js to set the LYNX token ID in the contract");
        console.log("- Run checkSupplyKey function and verify that hasSupplyKey is true");
        console.log("- If still not working, consider updating token supply key to explicitly target the contract");
      } else {
        console.log("The token does not have an admin key, so its configuration cannot be updated.");
        console.log("You would need to create a new token with the proper configuration.");
      }
    } else {
      console.log("The token's supply key is not properly configured for the contract to mint tokens.");
      
      if (tokenInfo.adminKey) {
        console.log("Since the token has an admin key, we can update the supply key to the contract's address.");
        needsUpdate = true;
      } else {
        console.log("The token cannot be modified. A new token would need to be created.");
      }
    }
    
    if (needsUpdate && tokenInfo.adminKey) {
      console.log("\nStep 7: Updating token supply key to contract address...");
      
      // This step is commented out for safety - uncomment and run only if you're certain about updating the token
      /*
      const updateTx = await new TokenUpdateTransaction()
        .setTokenId(tokenId)
        .setSupplyKey(contractId)
        .freezeWith(client)
        .sign(PrivateKey.fromString(operatorKey));
        
      const updateResponse = await updateTx.execute(client);
      const updateReceipt = await updateResponse.getReceipt(client);
      console.log(`Token update transaction status: ${updateReceipt.status.toString()}`);
      
      if (updateReceipt.status.toString() === "SUCCESS") {
        console.log("Token supply key successfully updated to contract address!");
        console.log("Now run the contract's checkSupplyKey function again to update its state.");
      }
      */
      console.log("Token update transaction commented out for safety.");
      console.log("Please review the code and uncomment the TokenUpdateTransaction if needed.");
    } else {
      console.log("\nNo automatic fixes are available or needed at this time.");
      console.log("Please proceed with the recommendations above.");
    }
    
    console.log("\nDiagnosis completed!");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the function
fixSupplyKeyIssue().catch(console.error); 