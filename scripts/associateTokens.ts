const { 
    ContractId: AssociateContractId, 
    ContractExecuteTransaction: AssociateContractExecute, 
    ContractCallQuery: AssociateContractQuery, 
    Client: AssociateClient, 
    Hbar: AssociateHbar,
    ContractFunctionParameters: AssociateFunctionParams,
    Status: AssociateStatus,
    AccountId: AssociateAccountId
} = require("@hashgraph/sdk");
const associateEnvConfig = require("dotenv");

// Load environment variables
const associateResult = associateEnvConfig.config({ path: ".env.local" });
if (associateResult.error) {
    console.error("Error loading .env.local file:", associateResult.error);
    process.exit(1);
}

async function associateTokens() {
    try {
        // Log all relevant environment variables
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("OPERATOR_KEY:", process.env.OPERATOR_KEY ? "[REDACTED]" : "Missing");
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
        console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS || 
            !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID) {
            throw new Error("Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, SAUCE_TOKEN_ID, CLXY_TOKEN_ID");
        }

        console.log("Using operator ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("Using contract address:", process.env.LYNX_CONTRACT_ADDRESS);

        const client = AssociateClient.forTestnet();
        client.setOperator(process.env.NEXT_PUBLIC_OPERATOR_ID, process.env.OPERATOR_KEY);

        // Convert token IDs to Solidity addresses for logging purposes
        const sauceTokenId = AssociateAccountId.fromString(process.env.SAUCE_TOKEN_ID);
        const clxyTokenId = AssociateAccountId.fromString(process.env.CLXY_TOKEN_ID);
        const lynxTokenId = process.env.LYNX_TOKEN_ID ? AssociateAccountId.fromString(process.env.LYNX_TOKEN_ID) : null;
        
        const sauceTokenAddress = sauceTokenId.toSolidityAddress();
        const clxyTokenAddress = clxyTokenId.toSolidityAddress();
        const lynxTokenAddress = lynxTokenId ? lynxTokenId.toSolidityAddress() : null;
        
        console.log("SAUCE Token Solidity Address:", sauceTokenAddress);
        console.log("CLXY Token Solidity Address:", clxyTokenAddress);
        if (lynxTokenAddress) {
            console.log("LYNX Token Solidity Address:", lynxTokenAddress);
        }

        // Call the contract's associateTokens function (this associates tokens with the contract)
        console.log("Calling contract's associateTokens function...");
        const contractAssociateTransaction = new AssociateContractExecute()
            .setContractId(AssociateContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS))
            .setGas(3000000) // Increased gas limit for token associations
            .setFunction("associateTokens")
            .setMaxTransactionFee(new AssociateHbar(50)); // Increased max fee

        try {
            console.log("Executing contract association transaction...");
            const contractResponse = await contractAssociateTransaction.execute(client);
            console.log("Getting contract association receipt...");
            const contractReceipt = await contractResponse.getReceipt(client);
            console.log("Contract token association status:", contractReceipt.status.toString());
            
            if (contractReceipt.status.toString() === "SUCCESS") {
                console.log("Successfully associated tokens with the contract!");
            } else {
                console.error("Failed to associate tokens with the contract. Status:", contractReceipt.status.toString());
            }
        } catch (error: any) {
            console.error("Contract token association failed:", error);
            console.error("Error details:", error.message);
            
            // Try to get more detailed error information
            if (error.transactionId) {
                console.log("Transaction ID:", error.transactionId.toString());
            }
        }

        console.log("Association process completed.");
    } catch (error) {
        console.error("Error in associateTokens function:", error);
    }
}

// Run the function and ensure the script exits
associateTokens()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    });