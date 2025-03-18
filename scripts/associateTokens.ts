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
    throw new Error("Error loading .env.local file");
}

async function associateTokens() {
    // Log all relevant environment variables
    console.log("Environment variables:");
    console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
    console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
    console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);

    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS || !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID) {
        throw new Error("Missing environment variables. Required: NEXT_PUBLIC_OPERATOR_ID, OPERATOR_KEY, LYNX_CONTRACT_ADDRESS, SAUCE_TOKEN_ID, CLXY_TOKEN_ID");
    }

    console.log("Using operator ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
    console.log("Using contract address:", process.env.LYNX_CONTRACT_ADDRESS);

    const client = AssociateClient.forTestnet();
    client.setOperator(process.env.NEXT_PUBLIC_OPERATOR_ID, process.env.OPERATOR_KEY);

    // Convert token IDs to Solidity addresses
    const sauceTokenId = AssociateAccountId.fromString(process.env.SAUCE_TOKEN_ID);
    const clxyTokenId = AssociateAccountId.fromString(process.env.CLXY_TOKEN_ID);
    
    const sauceTokenAddress = sauceTokenId.toSolidityAddress();
    const clxyTokenAddress = clxyTokenId.toSolidityAddress();
    
    console.log("SAUCE Token Solidity Address:", sauceTokenAddress);
    console.log("CLXY Token Solidity Address:", clxyTokenAddress);

    // Call the HTS precompile directly
    const HTS_PRECOMPILE = "0x0000000000000000000000000000000000000360";
    console.log("Calling HTS precompile directly...");

    // Associate SAUCE token
    console.log("Associating SAUCE token...");
    const sauceTransaction = new AssociateContractExecute()
        .setContractId(AssociateContractId.fromString("0.0.360"))
        .setGas(1000000)
        .setFunction("associateToken", new AssociateFunctionParams()
            .addAddress(process.env.NEXT_PUBLIC_OPERATOR_EVM_ID)
            .addAddress(sauceTokenAddress))
        .setMaxTransactionFee(new AssociateHbar(30));

    console.log("Executing SAUCE token association...");
    try {
        const sauceResponse = await sauceTransaction.execute(client);
        console.log("Getting SAUCE token association receipt...");
        const sauceReceipt = await sauceResponse.getReceipt(client);
        console.log("SAUCE token association status:", sauceReceipt.status.toString());
    } catch (error: unknown) {
        console.error("SAUCE token association failed:", error);
    }

    // Associate CLXY token
    console.log("Associating CLXY token...");
    const clxyTransaction = new AssociateContractExecute()
        .setContractId(AssociateContractId.fromString("0.0.360"))
        .setGas(1000000)
        .setFunction("associateToken", new AssociateFunctionParams()
            .addAddress(process.env.NEXT_PUBLIC_OPERATOR_EVM_ID)
            .addAddress(clxyTokenAddress))
        .setMaxTransactionFee(new AssociateHbar(30));

    console.log("Executing CLXY token association...");
    try {
        const clxyResponse = await clxyTransaction.execute(client);
        console.log("Getting CLXY token association receipt...");
        const clxyReceipt = await clxyResponse.getReceipt(client);
        console.log("CLXY token association status:", clxyReceipt.status.toString());
    } catch (error: unknown) {
        console.error("CLXY token association failed:", error);
    }
}

associateTokens().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});