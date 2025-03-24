const { Client, AccountId, PrivateKey, ContractId, ContractCallQuery, ContractFunctionParameters } = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function checkTokenAddressFormat() {
  console.log("Checking token address format in contract...");

  // Validate environment variables
  const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const contractAddress = process.env.LYNX_CONTRACT_ADDRESS;
  const lynxTokenId = process.env.LYNX_TOKEN_ID;

  if (!operatorId || !operatorKey || !contractAddress) {
    throw new Error("Missing required environment variables");
  }
  
  console.log("Environment variables:");
  console.log(`NEXT_PUBLIC_OPERATOR_ID: ${operatorId}`);
  console.log(`LYNX_CONTRACT_ADDRESS: ${contractAddress}`);
  console.log(`LYNX_TOKEN_ID: ${lynxTokenId}`);
  
  // Initialize Hedera client
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));
  
  // Create contract ID from string
  const contract = ContractId.fromString(contractAddress);
  
  try {
    // Check current token addresses
    const getTokenAddressesQuery = new ContractCallQuery()
      .setContractId(contract)
      .setGas(100000)
      .setFunction("getTokenAddresses");
      
    const getTokenAddressesResult = await getTokenAddressesQuery.execute(client);
    const tokenAddresses = getTokenAddressesResult.getAddress(0);
    const sauceTokenAddress = getTokenAddressesResult.getAddress(1);
    const clxyTokenAddress = getTokenAddressesResult.getAddress(2);
    
    console.log("\nCurrent Token Addresses in Contract:");
    console.log(`LYNX Token: ${tokenAddresses}`);
    console.log(`SAUCE Token: ${sauceTokenAddress}`);
    console.log(`CLXY Token: ${clxyTokenAddress}`);

    // Convert LYNX token ID to proper solidity address format
    let solidityAddress = "";
    
    if (lynxTokenId) {
      // Parse token ID 
      const tokenIdParts = lynxTokenId.split(".");
      if (tokenIdParts.length === 3) {
        const tokenNum = parseInt(tokenIdParts[2]);
        
        // Convert to 32 bytes solidity address
        // First pad it with zeros
        solidityAddress = "0x" + tokenNum.toString(16).padStart(40, "0");
        console.log(`\nLYNX Token ID: ${lynxTokenId}`);
        console.log(`LYNX Token ID (decimal): ${tokenNum}`);
        console.log(`LYNX Token Solidity Address (calculated): ${solidityAddress}`);
      }
    }
    
    // Check if LYNX_TOKEN is zero address
    if (tokenAddresses === "0x0000000000000000000000000000000000000000") {
      console.log("\nLYNX_TOKEN is currently the zero address, which means we can set it.");
    } else {
      console.log("\nLYNX_TOKEN is already set to a non-zero address.");
      console.log("The setLynxTokenId function requires LYNX_TOKEN to be the zero address.");
    }
    
  } catch (error) {
    console.error("Error checking token address format:", error);
  }
}

// Execute the function
checkTokenAddressFormat().catch(console.error); 