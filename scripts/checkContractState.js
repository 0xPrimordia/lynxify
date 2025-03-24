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
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
      !process.env.LYNX_CONTRACT_ADDRESS) {
      throw new Error('Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS');
  }

  // Setup client
  const client = Client.forTestnet();
  const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
  client.setOperator(operatorId, operatorKey);

  // Get the contract ID
  const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
  console.log(`Checking state of contract: ${contractId}`);

  // Output environment variables
  console.log("Environment Variables:");
  console.log(`NEXT_PUBLIC_OPERATOR_ID: ${process.env.NEXT_PUBLIC_OPERATOR_ID}`);
  console.log(`LYNX_CONTRACT_ADDRESS: ${process.env.LYNX_CONTRACT_ADDRESS}`);
  console.log(`SAUCE_TOKEN_ID: ${process.env.SAUCE_TOKEN_ID || 'Not set'}`);
  console.log(`CLXY_TOKEN_ID: ${process.env.CLXY_TOKEN_ID || 'Not set'}`);
  console.log(`LYNX_TOKEN_ID: ${process.env.LYNX_TOKEN_ID || 'Not set'}`);

  // Query the contract for each state variable
  try {
    // Get token addresses
    console.log("\nChecking token addresses...");
    const tokenAddressesQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getTokenAddresses")
      .setMaxQueryPayment(new Hbar(0.1));
    
    const tokenAddressesResponse = await tokenAddressesQuery.execute(client);
    console.log("LYNX Token Address:", tokenAddressesResponse.getAddress(0));
    console.log("SAUCE Token Address:", tokenAddressesResponse.getAddress(1));
    console.log("CLXY Token Address:", tokenAddressesResponse.getAddress(2));

    // Check if the contract has the supply key
    console.log("\nChecking if contract has supply key...");
    const hasSupplyKeyQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey")
      .setMaxQueryPayment(new Hbar(0.1));
    
    const hasSupplyKeyResponse = await hasSupplyKeyQuery.execute(client);
    console.log("Has Supply Key:", hasSupplyKeyResponse.getBool(0));

    // Check token ratios
    console.log("\nChecking token ratios...");
    const hbarRatioQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getHbarRatio")
      .setMaxQueryPayment(new Hbar(0.1));
    
    const hbarRatioResponse = await hbarRatioQuery.execute(client);
    console.log("HBAR Ratio:", hbarRatioResponse.getUint256(0).toString());

    const sauceRatioQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getSauceRatio")
      .setMaxQueryPayment(new Hbar(0.1));
    
    const sauceRatioResponse = await sauceRatioQuery.execute(client);
    console.log("SAUCE Ratio:", sauceRatioResponse.getUint256(0).toString());

    const clxyRatioQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("getClxyRatio")
      .setMaxQueryPayment(new Hbar(0.1));
    
    const clxyRatioResponse = await clxyRatioQuery.execute(client);
    console.log("CLXY Ratio:", clxyRatioResponse.getUint256(0).toString());

    // Check the admin
    console.log("\nChecking admin address...");
    const adminQuery = new ContractCallQuery()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("ADMIN")
      .setMaxQueryPayment(new Hbar(0.1));
    
    const adminResponse = await adminQuery.execute(client);
    console.log("Admin Address:", adminResponse.getAddress(0));

    // Check contract balance
    console.log("\nChecking contract balance...");
    try {
      const balance = await client.getAccountBalance(contractId);
      console.log(`Contract HBAR Balance: ${balance.hbars.toString()}`);
    } catch (error) {
      console.log("Failed to get contract balance:", error.message);
    }

    return "Contract state check completed";
  } catch (error) {
    console.error("Failed during contract state check:", error.message);
    throw error;
  }
}

checkContractState()
  .then((result) => {
    console.log(`\n${result}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Process failed:", error);
    process.exit(1);
  }); 