const { Client, AccountId, PrivateKey, ContractId, ContractCallQuery } = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function checkLynxTokenMatch() {
  console.log("Checking if LYNX token in contract matches environment variable...");

  // Get environment variables
  const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const contractAddress = process.env.LYNX_CONTRACT_ADDRESS;
  const lynxTokenId = process.env.LYNX_TOKEN_ID;

  if (!operatorId || !operatorKey || !contractAddress || !lynxTokenId) {
    console.error("Error: Missing required environment variables");
    return;
  }

  console.log(`Contract address: ${contractAddress}`);
  console.log(`LYNX token ID from .env: ${lynxTokenId}`);
  
  // Initialize client
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
  
  // Create contract ID
  const contractId = ContractId.fromString(contractAddress);
  
  try {
    // Call the contract to get the LYNX token address
    const query = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN");
    
    const result = await query.execute(client);
    const lynxTokenAddressInContract = result.getAddress(0);
    
    console.log(`\nLYNX token address in contract: ${lynxTokenAddressInContract}`);
    
    // Convert our token ID to expected format
    const tokenIdParts = lynxTokenId.split(".");
    if (tokenIdParts.length !== 3) {
      console.error("Invalid token ID format");
      return;
    }
    
    const tokenNum = parseInt(tokenIdParts[2]);
    const expectedTokenAddress = "0x" + tokenNum.toString(16).padStart(40, "0");
    
    console.log(`Expected token address from ID ${lynxTokenId}: ${expectedTokenAddress}`);
    
    // Compare addresses
    if (lynxTokenAddressInContract.toLowerCase() === expectedTokenAddress.toLowerCase()) {
      console.log("\nThe LYNX token address in the contract MATCHES the one we're trying to set!");
      console.log("No need to call setLynxTokenId() because it's already set correctly.");
    } else {
      console.log("\nThe LYNX token address in the contract DOES NOT MATCH the one we're trying to set.");
      console.log("But setLynxTokenId() can only be called when LYNX_TOKEN is the zero address.");
    }
    
    // Check hasSupplyKey status
    const hasSupplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const hasSupplyKeyResult = await hasSupplyKeyQuery.execute(client);
    const hasSupplyKey = hasSupplyKeyResult.getBool(0);
    
    console.log(`\nContract has supply key: ${hasSupplyKey}`);
    
    if (!hasSupplyKey) {
      console.log("The contract doesn't have the supply key. We need to verify the supply key.");
      console.log("Try calling the checkSupplyKey() function on the contract.");
    } else {
      console.log("The contract has the supply key. We can use mint() and burn() functions.");
    }
  } catch (error) {
    console.error("Error checking LYNX token address:", error);
  }
}

// Run the function
checkLynxTokenMatch().catch(console.error); 