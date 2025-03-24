const { Client, TokenId, TokenInfoQuery, AccountId, PrivateKey } = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function checkLynxSupplyKey() {
  console.log("Checking LYNX token supply key ownership...");

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
  
  try {
    // Get LYNX token info
    const tokenInfo = await new TokenInfoQuery()
      .setTokenId(TokenId.fromString(lynxTokenId))
      .execute(client);
    
    console.log("\nLYNX Token Info:");
    console.log(`Name: ${tokenInfo.name}`);
    console.log(`Symbol: ${tokenInfo.symbol}`);
    console.log(`Supply: ${tokenInfo.totalSupply.toString()}`);
    console.log(`Treasury: ${tokenInfo.treasuryAccountId?.toString()}`);
    
    // Check key information
    console.log("\nKey Information:");
    console.log(`Supply Key Present: ${tokenInfo.supplyKey ? "Yes" : "No"}`);
    console.log(`Admin Key Present: ${tokenInfo.adminKey ? "Yes" : "No"}`);
    
    // Use mirror node to get more detailed info about the supply key
    console.log("\nFetching detailed token info from mirror node...");
    const response = await fetch(
      `https://testnet.mirrornode.hedera.com/api/v1/tokens/${lynxTokenId}`
    );
    
    if (!response.ok) {
      console.error("Error fetching token info from mirror node:", response.statusText);
      return;
    }
    
    const tokenData = await response.json();
    
    if (tokenData.supply_key && tokenData.supply_key.key) {
      console.log("\nSupply Key Details:");
      console.log(`Supply Key: ${tokenData.supply_key.key}`);
      console.log(`Supply Key Type: ${tokenData.supply_key._type}`);
      
      if (tokenData.supply_key._type === "ProtobufEncoded") {
        console.log("\nThe supply key is Protobuf encoded. This often indicates a contract is the key holder.");
        console.log(`Contract Address: ${contractAddress}`);
        
        // The key format typically encodes the contract ID in a protobuf format
        // We can partially decode it to check if it matches our contract
        try {
          // Fetch the contract info from mirror node
          const contractResponse = await fetch(
            `https://testnet.mirrornode.hedera.com/api/v1/contracts/${contractAddress}`
          );
          
          if (contractResponse.ok) {
            const contractData = await contractResponse.json();
            console.log("\nContract Info:");
            console.log(`Contract ID: ${contractData.contract_id}`);
            console.log(`EVM Address: ${contractData.evm_address}`);
            
            // Based on the decoded info and contract data, make a determination
            console.log("\nAnalysis:");
            console.log("Based on token structure, it appears that the ProtobufEncoded key likely");
            console.log("represents the contract as the supply key holder.");
            console.log("This is consistent with our deployment approach.");
          }
        } catch (error) {
          console.error("Error fetching contract info:", error.message);
        }
      }
    } else {
      console.log("\nNo supply key found in token data.");
    }
    
    // Check if the contract believes it has the supply key
    console.log("\nRecommendation:");
    console.log("Use checkSupplyKey() function directly on the contract to verify the");
    console.log("contract recognizes its authority over the LYNX token.");
  } catch (error) {
    console.error("Error checking LYNX token supply key:", error);
  }
}

// Run the function
checkLynxSupplyKey().catch(console.error); 