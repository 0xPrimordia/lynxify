const { 
  Client, 
  AccountId, 
  PrivateKey, 
  ContractId,
  ContractCallQuery,
  Hbar
} = require('@hashgraph/sdk');
require('dotenv').config({ path: './.env.local' });

async function checkContractState() {
  try {
    console.log("=== Contract State Check ===");
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
      console.log("\n=== Checking Public State Variables ===");
      
      // Check LYNX_TOKEN
      const lynxTokenQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("LYNX_TOKEN")
        .setQueryPayment(new Hbar(0.1));
      
      const lynxResult = await lynxTokenQuery.execute(client);
      const lynxAddress = lynxResult.getAddress();
      console.log("LYNX_TOKEN Address:", lynxAddress);
      
      // Check SAUCE_TOKEN
      const sauceTokenQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("SAUCE_TOKEN")
        .setQueryPayment(new Hbar(0.1));
      
      const sauceResult = await sauceTokenQuery.execute(client);
      const sauceAddress = sauceResult.getAddress();
      console.log("SAUCE_TOKEN Address:", sauceAddress);
      
      // Check CLXY_TOKEN
      const clxyTokenQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("CLXY_TOKEN")
        .setQueryPayment(new Hbar(0.1));
      
      const clxyResult = await clxyTokenQuery.execute(client);
      const clxyAddress = clxyResult.getAddress();
      console.log("CLXY_TOKEN Address:", clxyAddress);
      
      // Check TREASURY_ACCOUNT
      const treasuryQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("TREASURY_ACCOUNT")
        .setQueryPayment(new Hbar(0.1));
      
      const treasuryResult = await treasuryQuery.execute(client);
      const treasuryAddress = treasuryResult.getAddress();
      console.log("TREASURY_ACCOUNT Address:", treasuryAddress);
      
      // Check token ratios
      const hbarRatioQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("HBAR_RATIO")
        .setQueryPayment(new Hbar(0.1));
      
      const hbarRatioResult = await hbarRatioQuery.execute(client);
      const hbarRatio = hbarRatioResult.getUint256(0);
      console.log("HBAR_RATIO:", hbarRatio.toString());
      
      const sauceRatioQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("SAUCE_RATIO")
        .setQueryPayment(new Hbar(0.1));
      
      const sauceRatioResult = await sauceRatioQuery.execute(client);
      const sauceRatio = sauceRatioResult.getUint256(0);
      console.log("SAUCE_RATIO:", sauceRatio.toString());
      
      const clxyRatioQuery = new ContractCallQuery()
        .setContractId(contractId)
        .setGas(100000)
        .setFunction("CLXY_RATIO")
        .setQueryPayment(new Hbar(0.1));
      
      const clxyRatioResult = await clxyRatioQuery.execute(client);
      const clxyRatio = clxyRatioResult.getUint256(0);
      console.log("CLXY_RATIO:", clxyRatio.toString());
      
    } catch (error) {
      console.error("Error checking state variables:", error.message);
    }
    
    console.log("\n=== Contract State Check Complete ===");
  } catch (error) {
    console.error("Error in contract state check:", error);
    console.error("Error message:", error.message);
  }
}

// Run the function and ensure the script exits
checkContractState()
  .then(() => {
    console.log("Script execution completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error in script execution:", error);
    process.exit(1);
  }); 