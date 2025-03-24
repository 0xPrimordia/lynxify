const { Client, AccountId, PrivateKey, ContractId, ContractCallQuery } = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function checkDirectLynxToken() {
  console.log("Checking LYNX token address directly in contract...");

  // Get environment variables
  const operatorId = process.env.NEXT_PUBLIC_OPERATOR_ID;
  const operatorKey = process.env.OPERATOR_KEY;
  const contractAddress = process.env.LYNX_CONTRACT_ADDRESS;

  if (!operatorId || !operatorKey || !contractAddress) {
    console.error("Error: Missing required environment variables");
    return;
  }

  console.log(`Contract address: ${contractAddress}`);
  
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
    const lynxTokenAddress = result.getAddress(0);
    
    console.log(`\nLYNX token address in contract: ${lynxTokenAddress}`);
    
    // Check if it's the zero address
    if (lynxTokenAddress === "0x0000000000000000000000000000000000000000") {
      console.log("LYNX token is set to the zero address. We can call setLynxTokenId().");
    } else {
      console.log("LYNX token is NOT the zero address. setLynxTokenId() will revert.");
    }
  } catch (error) {
    console.error("Error checking LYNX token address:", error);
  }
}

// Run the function
checkDirectLynxToken().catch(console.error); 