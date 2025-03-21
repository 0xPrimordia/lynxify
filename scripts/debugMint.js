const {
    Client,
    ContractId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractCallQuery,
    Hbar,
    AccountId,
    TokenId,
    PrivateKey,
    AccountBalanceQuery
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function debugMint() {
    try {
        console.log("=== Mint Function Debug ===");
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);
        console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
        console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);

        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS) {
            throw new Error("Missing environment variables");
        }

        // Setup client
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        const client = Client.forTestnet().setOperator(operatorId, operatorKey);

        // Contract & token IDs
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
        const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);

        console.log("\n=== Step 1: Check Balances and Allowances ===");

        // Check account balances
        const balanceQuery = new AccountBalanceQuery()
            .setAccountId(operatorId);
        
        const accountBalance = await balanceQuery.execute(client);
        
        // Check HBAR balance
        console.log(`HBAR Balance: ${accountBalance.hbars.toString()}`);
        
        // Check token balances
        const lynxBalance = accountBalance.tokens.get(lynxTokenId);
        const sauceBalance = accountBalance.tokens.get(sauceTokenId);
        const clxyBalance = accountBalance.tokens.get(clxyTokenId);
        
        console.log(`LYNX Balance: ${lynxBalance !== undefined ? lynxBalance.toString() : 'None'}`);
        console.log(`SAUCE Balance: ${sauceBalance !== undefined ? sauceBalance.toString() : 'None'}`);
        console.log(`CLXY Balance: ${clxyBalance !== undefined ? clxyBalance.toString() : 'None'}`);

        // Check token allowances using the contract's functions
        const sauceAllowanceQuery = new ContractCallQuery()
            .setContractId(lynxTokenId) // Using token contract
            .setGas(100000)
            .setFunction("allowance", new ContractFunctionParameters()
                .addAddress(operatorId.toSolidityAddress())
                .addAddress(contractId.toSolidityAddress()))
            .setQueryPayment(new Hbar(0.1));
            
        try {
            const sauceAllowanceResult = await sauceAllowanceQuery.execute(client);
            const sauceAllowance = sauceAllowanceResult.getUint256(0);
            console.log(`SAUCE Allowance: ${sauceAllowance.toString()}`);
        } catch (error) {
            console.error("Error getting SAUCE allowance:", error.message);
        }

        // Check if treasury has approved the contract to spend LYNX tokens
        const lynxAllowanceQuery = new ContractCallQuery()
            .setContractId(lynxTokenId) // Using token contract
            .setGas(100000)
            .setFunction("allowance", new ContractFunctionParameters()
                .addAddress(operatorId.toSolidityAddress()) // Treasury is the operator
                .addAddress(contractId.toSolidityAddress()))
            .setQueryPayment(new Hbar(0.2));
            
        try {
            const lynxAllowanceResult = await lynxAllowanceQuery.execute(client);
            const lynxAllowance = lynxAllowanceResult.getUint256(0);
            console.log(`Treasury LYNX Allowance for Contract: ${lynxAllowance.toString()}`);
        } catch (error) {
            console.error("Error getting LYNX allowance:", error.message);
        }

        console.log("\n=== Step 2: Check Contract LYNX Token Address ===");
        
        const lynxAddressQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("LYNX_TOKEN")
            .setQueryPayment(new Hbar(0.1));
            
        const lynxAddressResult = await lynxAddressQuery.execute(client);
        const contractLynxAddress = lynxAddressResult.getAddress();
        const actualLynxAddress = lynxTokenId.toSolidityAddress();
        
        console.log(`Contract's LYNX Address: ${contractLynxAddress}`);
        console.log(`Actual LYNX Address:    ${actualLynxAddress}`);
        console.log(`Match: ${contractLynxAddress === actualLynxAddress}`);

        console.log("\n=== Step 3: Check if Contract is Associated with Tokens ===");
        
        // Check if contract is associated with LYNX token
        const lynxContractBalanceQuery = new ContractCallQuery()
            .setContractId(lynxTokenId)
            .setGas(100000)
            .setFunction("balanceOf", new ContractFunctionParameters()
                .addAddress(contractId.toSolidityAddress()))
            .setQueryPayment(new Hbar(0.1));
        
        try {
            const lynxContractBalanceResult = await lynxContractBalanceQuery.execute(client);
            const lynxContractBalance = lynxContractBalanceResult.getUint256(0);
            console.log(`Contract's LYNX Balance: ${lynxContractBalance.toString()}`);
            console.log(`Contract is associated with LYNX: ${lynxContractBalance !== undefined ? 'Yes' : 'Unknown'}`);
        } catch (error) {
            console.error("Error checking contract's LYNX balance:", error.message);
            console.log("Contract may not be associated with LYNX");
        }
        
        console.log("\n=== Mint Debug Complete ===");
    } catch (error) {
        console.error("Error in mint debug:", error);
        console.error("Error message:", error.message);
    }
}

// Run the function
debugMint()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Script execution failed:", error);
        process.exit(1);
    }); 