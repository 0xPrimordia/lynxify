const { Client, AccountId, PrivateKey, ContractId, ContractExecuteTransaction } = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function updateSupplyKeyStatus() {
  console.log("Updating supply key status in the contract...");

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
    console.log("Calling checkSupplyKey() on the contract...");
    
    // Call the checkSupplyKey function
    const transaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("checkSupplyKey");
    
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    console.log(`Transaction status: ${receipt.status.toString()}`);
    console.log("Supply key status updated successfully.");
    
    // Now let's check the hasSupplyKey status
    const queryTransaction = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(100000)
      .setFunction("hasSupplyKey");
    
    const queryResponse = await queryTransaction.execute(client);
    const record = await queryResponse.getRecord(client);
    
    // The result is in the contractFunctionResult
    const result = record.contractFunctionResult.getBool(0);
    
    console.log(`Current hasSupplyKey value: ${result}`);
    
    if (result) {
      console.log("The contract has the supply key. We can use mint() and burn() functions.");
    } else {
      console.log("The contract doesn't have the supply key.");
    }
  } catch (error) {
    console.error("Error updating supply key status:", error);
  }
}

// Run the function
updateSupplyKeyStatus().catch(console.error); 