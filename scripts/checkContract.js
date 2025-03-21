const { 
    Client, 
    ContractInfoQuery, 
    ContractId,
    AccountId,
    PrivateKey
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function checkContract() {
    // Setup client with operator
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);
    
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    
    console.log('LYNX_CONTRACT_ADDRESS:', process.env.LYNX_CONTRACT_ADDRESS);
    console.log('Checking Contract ID:', contractId.toString());
    
    try {
        const info = await new ContractInfoQuery()
            .setContractId(contractId)
            .execute(client);
        
        console.log('Contract exists!');
        console.log('Contract memo:', info.contractMemo);
        console.log('Admin key exists:', info.adminKey !== null);
        console.log('Contract expiration:', info.expirationTime?.toString() || 'None');
    } catch (e) {
        console.error('Error querying contract:', e.message);
    }
}

// Run the function and ensure the script exits properly
checkContract()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch(err => {
        console.error("Error in script:", err);
        process.exit(1);
    }); 