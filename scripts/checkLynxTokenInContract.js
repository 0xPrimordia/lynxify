require('dotenv').config({ path: './.env.local' });
const { 
    Client, 
    AccountId, 
    PrivateKey,
    ContractId,
    ContractCallQuery,
    Hbar
} = require("@hashgraph/sdk");

async function checkLynxTokenInContract() {
    console.log("Checking LYNX_TOKEN variable directly in contract...");
    
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS) {
        throw new Error('Missing environment variables');
    }

    // Setup client
    const client = Client.forTestnet();
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    client.setOperator(operatorId, operatorKey);

    // Get contract ID
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    console.log(`Contract ID: ${contractId}`);

    try {
        // Query the LYNX_TOKEN variable directly
        const lynxTokenQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("LYNX_TOKEN")
            .setMaxQueryPayment(new Hbar(0.1));
        
        console.log("Executing query to get LYNX_TOKEN value...");
        const response = await lynxTokenQuery.execute(client);
        
        // Check if we have a response
        if (!response) {
            console.log("No response from the contract");
            return null;
        }
        
        // Try to get the address
        try {
            const address = response.getAddress(0);
            console.log(`LYNX_TOKEN address: ${address}`);
            
            const isZeroAddress = address === '0000000000000000000000000000000000000000';
            console.log(`Is zero address: ${isZeroAddress}`);
            
            if (isZeroAddress) {
                console.log("✅ LYNX_TOKEN is set to the zero address, you can use setLynxTokenId to update it");
            } else {
                console.log("❌ LYNX_TOKEN is not the zero address, setLynxTokenId will revert due to require check");
            }
            
            return address;
        } catch (error) {
            console.log("Error parsing response:", error.message);
            console.log("Raw response:", response);
            return "Error parsing response";
        }
    } catch (error) {
        console.error("Failed to query LYNX_TOKEN from contract:", error.message);
        throw error;
    }
}

checkLynxTokenInContract()
    .then((result) => {
        console.log(`\nQuery completed. Result: ${result}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Query failed:", error);
        process.exit(1);
    }); 