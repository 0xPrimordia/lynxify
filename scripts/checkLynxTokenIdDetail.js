const { Client, AccountId, PrivateKey, ContractId, ContractCallQuery, ContractFunctionParameters } = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function checkLynxTokenIdDetail() {
  console.log("Checking contract state in detail...");

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
    // Check if the contract has the supply key
    const hasSupplyKeyQuery = new ContractCallQuery()
      .setContractId(contract)
      .setGas(100000)
      .setFunction("hasSupplyKey");
      
    const hasSupplyKeyResult = await hasSupplyKeyQuery.execute(client);
    const hasSupplyKey = hasSupplyKeyResult.getBool(0);
    console.log(`\nContract has supply key: ${hasSupplyKey}`);
    
    // Check current token addresses
    const getTokenAddressesQuery = new ContractCallQuery()
      .setContractId(contract)
      .setGas(100000)
      .setFunction("getTokenAddresses");
      
    const getTokenAddressesResult = await getTokenAddressesQuery.execute(client);
    const lynxTokenAddress = getTokenAddressesResult.getAddress(0);
    const sauceTokenAddress = getTokenAddressesResult.getAddress(1);
    const clxyTokenAddress = getTokenAddressesResult.getAddress(2);
    
    console.log("\nToken Addresses in Contract:");
    console.log(`LYNX Token: ${lynxTokenAddress}`);
    console.log(`SAUCE Token: ${sauceTokenAddress}`);
    console.log(`CLXY Token: ${clxyTokenAddress}`);
    
    // Check if LYNX_TOKEN is the zero address
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    if (lynxTokenAddress === zeroAddress) {
      console.log("\nLYNX_TOKEN is the zero address in the contract");
    } else {
      console.log("\nLYNX_TOKEN is NOT the zero address in the contract");
      
      // Check if it matches our expected address format
      if (lynxTokenId) {
        const tokenIdParts = lynxTokenId.split(".");
        if (tokenIdParts.length === 3) {
          const tokenNum = parseInt(tokenIdParts[2]);
          const expectedAddress = "0x" + tokenNum.toString(16).padStart(40, "0");
          console.log(`Expected LYNX Token address: ${expectedAddress}`);
          
          if (lynxTokenAddress.toLowerCase() === expectedAddress.toLowerCase()) {
            console.log("The current LYNX token address matches our expected address format");
          } else {
            console.log("The current LYNX token address DOES NOT match our expected format");
          }
        }
      }
    }
    
    // Get the ADMIN address
    const adminQuery = new ContractCallQuery()
      .setContractId(contract)
      .setGas(100000)
      .setFunction("ADMIN");
      
    const adminResult = await adminQuery.execute(client);
    const adminAddress = adminResult.getAddress(0);
    console.log(`\nADMIN address: ${adminAddress}`);
    
    // Get current ratios
    const hbarRatioQuery = new ContractCallQuery()
      .setContractId(contract)
      .setGas(100000)
      .setFunction("getHbarRatio");
      
    const hbarRatioResult = await hbarRatioQuery.execute(client);
    const hbarRatio = hbarRatioResult.getUint256(0);
    
    const sauceRatioQuery = new ContractCallQuery()
      .setContractId(contract)
      .setGas(100000)
      .setFunction("getSauceRatio");
      
    const sauceRatioResult = await sauceRatioQuery.execute(client);
    const sauceRatio = sauceRatioResult.getUint256(0);
    
    const clxyRatioQuery = new ContractCallQuery()
      .setContractId(contract)
      .setGas(100000)
      .setFunction("getClxyRatio");
      
    const clxyRatioResult = await clxyRatioQuery.execute(client);
    const clxyRatio = clxyRatioResult.getUint256(0);
    
    console.log("\nToken Ratios:");
    console.log(`HBAR Ratio: ${hbarRatio}`);
    console.log(`SAUCE Ratio: ${sauceRatio}`);
    console.log(`CLXY Ratio: ${clxyRatio}`);
    
  } catch (error) {
    console.error("Error checking contract state:", error);
  }
}

// Execute the function
checkLynxTokenIdDetail().catch(console.error); 