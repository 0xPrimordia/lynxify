require('dotenv').config({ path: './.env.local' });
const {
  Client,
  AccountId,
  PrivateKey,
  ContractId,
  ContractCallQuery,
  ContractFunctionParameters
} = require("@hashgraph/sdk");

async function debugContract() {
  console.log("Starting contract debugging...");

  // Check required environment variables
  console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
  console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
  console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
  console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
  console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY ||
      !process.env.LYNX_CONTRACT_ADDRESS || !process.env.SAUCE_TOKEN_ID ||
      !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
    throw new Error("Missing required environment variables");
  }

  // Use the variables
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  const lynxTokenId = process.env.LYNX_TOKEN_ID;
  const sauceTokenId = process.env.SAUCE_TOKEN_ID;
  const clxyTokenId = process.env.CLXY_TOKEN_ID;
  
  // Set up client
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);
  
  try {
    // Check contract constants
    console.log("Checking contract token addresses...");
    
    // Check LYNX_TOKEN address
    const lynxTokenQuery = await new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("LYNX_TOKEN")
      .execute(client);
    const contractLynxAddress = lynxTokenQuery.getAddress(0);
    console.log("Contract LYNX_TOKEN address:", contractLynxAddress);
    console.log("Expected address (from AccountId):", AccountId.fromString(lynxTokenId).toSolidityAddress());
    
    // Check SAUCE_TOKEN address
    const sauceTokenQuery = await new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("SAUCE_TOKEN")
      .execute(client);
    const contractSauceAddress = sauceTokenQuery.getAddress(0);
    console.log("Contract SAUCE_TOKEN address:", contractSauceAddress);
    console.log("Expected address (from AccountId):", AccountId.fromString(sauceTokenId).toSolidityAddress());
    
    // Check CLXY_TOKEN address
    const clxyTokenQuery = await new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("CLXY_TOKEN")
      .execute(client);
    const contractClxyAddress = clxyTokenQuery.getAddress(0);
    console.log("Contract CLXY_TOKEN address:", contractClxyAddress);
    console.log("Expected address (from AccountId):", AccountId.fromString(clxyTokenId).toSolidityAddress());
    
    // Check TREASURY_ACCOUNT address
    const treasuryQuery = await new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("TREASURY_ACCOUNT")
      .execute(client);
    const contractTreasuryAddress = treasuryQuery.getAddress(0);
    console.log("Contract TREASURY_ACCOUNT address:", contractTreasuryAddress);
    console.log("Expected address (from AccountId):", operatorId.toSolidityAddress());
    
    // Skip the failing function call
    console.log("\nSkipping checkTokenAssociations due to gas issues");
    
    // Check if contract has balance of tokens
    console.log("\nChecking contract token balances (these will fail if tokens aren't associated)...");
    
    // Check LYNX balance
    try {
      const lynxBalanceQuery = await new ContractCallQuery()
        .setContractId(ContractId.fromString(lynxTokenId))
        .setGas(300000)
        .setFunction(
          "balanceOf",
          new ContractFunctionParameters()
            .addAddress(contractId.toSolidityAddress())
        )
        .execute(client);
      const lynxBalance = lynxBalanceQuery.getUint256(0);
      console.log(`Contract LYNX balance: ${lynxBalance.toString()} units`);
      console.log("LYNX is associated with the contract!");
    } catch (error) {
      console.error("Error checking LYNX balance - token likely not associated:", error.message);
    }
    
    // Check SAUCE balance
    try {
      const sauceBalanceQuery = await new ContractCallQuery()
        .setContractId(ContractId.fromString(sauceTokenId))
        .setGas(300000)
        .setFunction(
          "balanceOf",
          new ContractFunctionParameters()
            .addAddress(contractId.toSolidityAddress())
        )
        .execute(client);
      const sauceBalance = sauceBalanceQuery.getUint256(0);
      console.log(`Contract SAUCE balance: ${sauceBalance.toString()} units`);
      console.log("SAUCE is associated with the contract!");
    } catch (error) {
      console.error("Error checking SAUCE balance - token likely not associated:", error.message);
    }
    
    // Check CLXY balance
    try {
      const clxyBalanceQuery = await new ContractCallQuery()
        .setContractId(ContractId.fromString(clxyTokenId))
        .setGas(300000)
        .setFunction(
          "balanceOf",
          new ContractFunctionParameters()
            .addAddress(contractId.toSolidityAddress())
        )
        .execute(client);
      const clxyBalance = clxyBalanceQuery.getUint256(0);
      console.log(`Contract CLXY balance: ${clxyBalance.toString()} units`);
      console.log("CLXY is associated with the contract!");
    } catch (error) {
      console.error("Error checking CLXY balance - token likely not associated:", error.message);
    }
    
  } catch (error) {
    console.error("Error during debug process:", error);
    console.error(error.stack);
  }
}

// Run the debug function
debugContract()
  .then(() => {
    console.log("Debug complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Debug failed:", error);
    process.exit(1);
  }); 