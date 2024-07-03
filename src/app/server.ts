/*const { Client, AccountId, PrivateKey, ContractExecuteTransaction, Hbar } = require('@hashgraph/sdk');
const axios = require('axios');

const client = Client.forTestnet();
client.setOperator(AccountId.fromString("YOUR_ACCOUNT_ID"), PrivateKey.fromString("YOUR_PRIVATE_KEY"));

async function triggerPairMatching() {
    const contractId = "YOUR_CONTRACT_ID";
    
    const transaction = await new ContractExecuteTransaction()
        .setContractId(contractId)
        .setGas(1000000)
        .setFunction("matchAndCreateLiquidityPairs")
        .execute(client);

    const receipt = await transaction.getReceipt(client);
    console.log("Transaction status: " + receipt.status.toString());
}

setInterval(triggerPairMatching, 60000); // Run every 60 seconds

triggerPairMatching(); 
*/