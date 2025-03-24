require('dotenv').config({ path: './.env.local' });
const { 
    Client, 
    AccountId, 
    PrivateKey,
    ContractId,
    ContractCallQuery,
    ContractExecuteTransaction,
    TokenId,
    ContractFunctionParameters,
    Hbar,
    TokenAssociateTransaction
} = require("@hashgraph/sdk");

async function testFullFlow() {
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS || !process.env.SAUCE_TOKEN_ID || 
        !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
        throw new Error('Missing environment variables');
    }

    // Setup client
    const client = Client.forTestnet();
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    client.setOperator(operatorId, operatorKey);

    // Get contract and token IDs
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
    const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);

    console.log("=== Test Configuration ===");
    console.log(`Operator ID: ${operatorId}`);
    console.log(`Contract ID: ${contractId}`);
    console.log(`LYNX Token ID: ${lynxTokenId}`);
    console.log(`SAUCE Token ID: ${sauceTokenId}`);
    console.log(`CLXY Token ID: ${clxyTokenId}`);

    try {
        // Step 1: Print the current state of the contract
        console.log("\n=== Current Contract State ===");

        // Get token addresses
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
        const hasSupplyKeyQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("hasSupplyKey")
            .setMaxQueryPayment(new Hbar(0.1));
        
        const hasSupplyKeyResponse = await hasSupplyKeyQuery.execute(client);
        console.log("Has Supply Key:", hasSupplyKeyResponse.getBool(0));

        // Get token ratios
        const hbarRatioQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getHbarRatio")
            .setMaxQueryPayment(new Hbar(0.1));
        
        const hbarRatioResponse = await hbarRatioQuery.execute(client);
        const hbarRatio = hbarRatioResponse.getUint256(0);
        console.log("HBAR Ratio:", hbarRatio.toString());

        // Step 2: Force set the supply key status to true
        console.log("\n=== Setting Supply Key Status to True ===");
        const setSupplyKeyTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("setSupplyKeyStatus", new ContractFunctionParameters().addBool(true))
            .setMaxTransactionFee(new Hbar(5));
        
        const setSupplyKeySubmit = await setSupplyKeyTx.execute(client);
        const setSupplyKeyRx = await setSupplyKeySubmit.getReceipt(client);
        console.log("Set supply key status result:", setSupplyKeyRx.status.toString());

        // Step 3: Association with tokens directly
        console.log("\n=== Associating Tokens ===");
        
        // Associate operator account with LYNX token if needed
        console.log("Associating operator with LYNX token if needed...");
        try {
            const associateTx = await new TokenAssociateTransaction()
                .setAccountId(operatorId)
                .setTokenIds([lynxTokenId])
                .setMaxTransactionFee(new Hbar(5))
                .execute(client);
            
            const associateRx = await associateTx.getReceipt(client);
            console.log("Association status:", associateRx.status.toString());
        } catch (error) {
            console.log("Association may already exist or failed:", error.message);
        }

        // Step 4: Try minting LYNX tokens
        console.log("\n=== Attempting to Mint LYNX Tokens ===");
        // Calculate required amounts
        const lynxAmount = 100; // 100 LYNX tokens
        const hbarRequired = lynxAmount * hbarRatio;
        console.log(`Minting ${lynxAmount} LYNX tokens`);
        console.log(`Required HBAR: ${hbarRequired} tinybar`);

        // Get allowances first
        console.log("\nChecking token allowances before approvals...");
        const checkAllowancesTx = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("debugAllowances", new ContractFunctionParameters().addAddress(operatorId.toSolidityAddress()))
            .setMaxQueryPayment(new Hbar(0.1));
        
        const checkAllowancesResponse = await checkAllowancesTx.execute(client);
        console.log("SAUCE Allowance:", checkAllowancesResponse.getUint256(0).toString());
        console.log("CLXY Allowance:", checkAllowancesResponse.getUint256(1).toString());
        console.log("LYNX Allowance:", checkAllowancesResponse.getUint256(2).toString());

        console.log("\nTest completed.");
        return "Flow test completed successfully";
    } catch (error) {
        console.error("Error during test:", error.message);
        throw error;
    }
}

testFullFlow()
    .then((result) => {
        console.log(`\n${result}`);
        process.exit(0);
    })
    .catch((error) => {
        console.error("Test failed:", error);
        process.exit(1);
    }); 