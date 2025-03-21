const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractId,
  ContractCallQuery,
  ContractFunctionParameters
} = require('@hashgraph/sdk');
require('dotenv').config({ path: './.env.local' });

async function checkContractFunctions() {
  try {
    console.log("=== Contract Function Check ===");
    console.log("Environment variables:");
    console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
    console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
    console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
    console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);
    
    // Setup client with operator
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);
    
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    console.log("Contract ID:", contractId.toString());
    
    // Check token addresses stored in contract
    try {
      console.log("\n=== Checking Token Addresses ===");
      
      // Check LYNX token address
      const lynxTokenQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getLynxToken");
      
      const lynxResult = await lynxTokenQuery.execute(client);
      const lynxAddress = lynxResult.getAddress();
      console.log("LYNX Token Address in contract:", lynxAddress);
      
      // Check SAUCE token address
      const sauceTokenQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getSauceToken");
      
      const sauceResult = await sauceTokenQuery.execute(client);
      const sauceAddress = sauceResult.getAddress();
      console.log("SAUCE Token Address in contract:", sauceAddress);
      
      // Check CLXY token address
      const clxyTokenQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getClxyToken");
      
      const clxyResult = await clxyTokenQuery.execute(client);
      const clxyAddress = clxyResult.getAddress();
      console.log("CLXY Token Address in contract:", clxyAddress);
      
      // Check treasury address
      const treasuryQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getTreasury");
      
      const treasuryResult = await treasuryQuery.execute(client);
      const treasuryAddress = treasuryResult.getAddress();
      console.log("Treasury Address in contract:", treasuryAddress);
    } catch (error) {
      console.error("Error checking token addresses:", error.message);
    }
    
    // Check token ratios
    try {
      console.log("\n=== Checking Token Ratios ===");
      
      // Check SAUCE ratio
      const sauceRatioQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getTokenRatios", new ContractFunctionParameters().addUint8(0));
      
      const sauceRatioResult = await sauceRatioQuery.execute(client);
      const sauceRatio = sauceRatioResult.getUint256(0);
      console.log("SAUCE to LYNX ratio:", sauceRatio.toString());
      
      // Check CLXY ratio
      const clxyRatioQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("getTokenRatios", new ContractFunctionParameters().addUint8(1));
      
      const clxyRatioResult = await clxyRatioQuery.execute(client);
      const clxyRatio = clxyRatioResult.getUint256(0);
      console.log("CLXY to LYNX ratio:", clxyRatio.toString());
    } catch (error) {
      console.error("Error checking token ratios:", error.message);
    }
    
    console.log("\n=== Contract Function Check Complete ===");
  } catch (error) {
    console.error("Error in contract function check:", error);
    console.error("Error message:", error.message);
  }
}

// Run the function and ensure the script exits
checkContractFunctions()
  .then(() => {
    console.log("Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error in script execution:", error);
    process.exit(1);
  }); 