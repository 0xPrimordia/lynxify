const { 
    Client, 
    AccountId, 
    PrivateKey,
    ContractId,
    ContractCallQuery,
    Hbar,
    TokenId
} = require("@hashgraph/sdk");
require('dotenv').config({ path: './.env.local' });
const fs = require('fs');

async function getContractTokenId() {
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
    console.log(`Querying contract ${contractId} for LYNX token ID`);

    // Query the contract for the LYNX token ID
    try {
        const query = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getLynxTokenId")
            .setMaxQueryPayment(new Hbar(0.1));
        
        console.log("Executing query to get LYNX token ID...");
        const response = await query.execute(client);
        
        // Check if we have a response
        if (!response) {
            console.log("No response from the contract");
            return null;
        }
        
        console.log("Response received:", response);
        
        try {
            // Try different ways to parse the response
            if (response.address) {
                const addressStr = response.address.toString();
                console.log(`Address from response: ${addressStr}`);
                return addressStr;
            }
            
            if (response.getAddress) {
                const address = response.getAddress(0);
                console.log(`Address from getAddress: ${address}`);
                return address;
            }
            
            // Try to get the result as a string
            if (response.getString) {
                const str = response.getString(0);
                console.log(`String from response: ${str}`);
                return str;
            }
            
            // Try to get as uint256
            if (response.getUint256) {
                const num = response.getUint256(0);
                console.log(`UINT256 from response: ${num.toString()}`);
                return num.toString();
            }
            
            // Generic output
            console.log("Raw response:", JSON.stringify(response, null, 2));
            return "Could not parse response format";
        } catch (error) {
            console.log("Error parsing response:", error.message);
            console.log("Raw response:", response);
            return "Error parsing response";
        }
    } catch (error) {
        console.error("Failed to query token ID from contract:", error.message);
        throw error;
    }
}

getContractTokenId()
    .then((tokenId) => {
        console.log(`Process completed successfully, LYNX token ID: ${tokenId}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Process failed:", error);
        process.exit(1);
    }); 