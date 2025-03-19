const { 
    Client: CheckClient, 
    AccountId: CheckAccountId, 
    PrivateKey: CheckPrivateKey,
    AccountBalanceQuery: CheckBalanceQuery
} = require("@hashgraph/sdk");
const checkEnvConfig = require("dotenv");

// Load environment variables
const checkResult = checkEnvConfig.config({ path: ".env.local" });
if (checkResult.error) {
    throw new Error("Error loading .env.local file");
}

async function checkTokenAssociations() {
    const client = CheckClient.forTestnet();
    const operatorId = CheckAccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
    const operatorKey = CheckPrivateKey.fromString(process.env.OPERATOR_KEY!);
    client.setOperator(operatorId, operatorKey);

    // Using the known working contract
    const contractId = CheckAccountId.fromString("0.0.5639959");
    
    console.log("Checking associations for contract:", contractId.toString());

    const balanceQuery = new CheckBalanceQuery()
        .setAccountId(contractId);

    const balance = await balanceQuery.execute(client);
    console.log("Contract token associations:", balance.tokens?.toString());
}

checkTokenAssociations().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});