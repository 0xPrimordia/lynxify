require('dotenv').config({ path: './.env.local' });
const {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  ContractId,
  ContractCallQuery,
  Hbar
} = require("@hashgraph/sdk");

async function debugContract() {
  console.log("===== DEBUGGING CONTRACT STATE =====");
  
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
      !process.env.LYNX_CONTRACT_ADDRESS) {
    throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS');
  }

  // Setup client
  console.log("Setting up Hedera client...");
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  client.setOperator(operatorId, operatorKey);

  console.log("ENVIRONMENT VARIABLES:");
  console.log(`- NEXT_PUBLIC_OPERATOR_ID: ${process.env.NEXT_PUBLIC_OPERATOR_ID}`);
  console.log(`- LYNX_CONTRACT_ADDRESS: ${process.env.LYNX_CONTRACT_ADDRESS}`);
  if (process.env.LYNX_TOKEN_ID) {
    console.log(`- LYNX_TOKEN_ID: ${process.env.LYNX_TOKEN_ID}`);
  }
  
  const contractId = process.env.LYNX_CONTRACT_ADDRESS;
  
  try {
    console.log("\n=== Reading all contract state variables ===");
    
    // Read all key contract state variables
    const queries = [
      { name: "ADMIN", function: "ADMIN" },
      { name: "LYNX_TOKEN", function: "LYNX_TOKEN" },
      { name: "SAUCE_TOKEN", function: "SAUCE_TOKEN" },
      { name: "CLXY_TOKEN", function: "CLXY_TOKEN" },
      { name: "hasSupplyKey", function: "hasSupplyKey" },
      { name: "HTS_PRECOMPILE", function: "HTS_PRECOMPILE" },
      { name: "HBAR_RATIO", function: "getHbarRatio" },
      { name: "SAUCE_RATIO", function: "getSauceRatio" },
      { name: "CLXY_RATIO", function: "getClxyRatio" }
    ];
    
    for (const query of queries) {
      try {
        console.log(`\n--- Reading ${query.name} ---`);
        
        const contractQuery = new ContractCallQuery()
          .setContractId(contractId)
          .setGas(100000)
          .setFunction(query.function);
        
        const queryResult = await contractQuery.execute(client);
        
        // Handle different return types
        let result;
        if (query.name === "hasSupplyKey") {
          result = queryResult.getBool(0);
        } else if (query.name.includes("RATIO")) {
          result = queryResult.getUint256(0).toString();
        } else {
          // Assume address for others
          result = queryResult.getAddress(0);
        }
        
        console.log(`${query.name}: ${result}`);
        
        // If it's a token address, try to convert to token ID
        if (query.name.includes("TOKEN") && query.name !== "LYNX_TOKEN" && result !== "0000000000000000000000000000000000000000") {
          try {
            const tokenNum = parseInt(result.slice(2), 16);
            const tokenId = `0.0.${tokenNum}`;
            console.log(`${query.name} as TokenId: ${tokenId}`);
          } catch (e) {
            console.log(`Couldn't convert to token ID: ${e.message}`);
          }
        }
      } catch (error) {
        console.error(`Error querying ${query.name}: ${error.message}`);
      }
    }
    
    // Additional checks
    console.log("\n=== Additional Checks ===");
    
    // Check if our operator is the ADMIN
    const operatorEVMAddress = operatorId.toSolidityAddress();
    console.log(`Operator EVM address: ${operatorEVMAddress}`);
    
    const adminQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("ADMIN");
    
    const adminResult = await adminQuery.execute(client);
    const adminAddress = adminResult.getAddress(0);
    const isAdmin = adminAddress.toLowerCase() === operatorEVMAddress.toLowerCase();
    console.log(`Is operator the ADMIN? ${isAdmin}`);
    
    // If we have a LYNX token set in the environment, check if it can be used
    if (process.env.LYNX_TOKEN_ID) {
      const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
      const tokenNum = parseInt(lynxTokenId.toString().split('.')[2]);
      const tokenHexString = tokenNum.toString(16);
      const tokenPaddedHex = tokenHexString.padStart(40, '0');
      const tokenFormattedAddress = `0x${tokenPaddedHex}`;
      console.log(`LYNX token formatted for contract: ${tokenFormattedAddress}`);
      
      // Check for condition where LYNX_TOKEN must be address(0) - e.g., in setLynxTokenId
      const tokenQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("LYNX_TOKEN");
      
      const tokenResult = await tokenQuery.execute(client);
      const currentTokenAddress = tokenResult.getAddress(0);
      const isZeroAddress = currentTokenAddress === "0000000000000000000000000000000000000000";
      console.log(`Is current LYNX_TOKEN zero address? ${isZeroAddress}`);
      console.log(`Is setLynxTokenId condition met (LYNX_TOKEN == address(0))? ${isZeroAddress}`);
    }
    
    console.log("\n===== DEBUG COMPLETED =====");
    console.log(`Please check the output above to understand the contract's current state.`);
    
  } catch (error) {
    console.error("Error during contract debugging:", error);
    throw error;
  }
}

// Run the function
debugContract()
  .then(() => {
    console.log("\nContract debugging completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nContract debugging failed:", error);
    process.exit(1);
  }); 