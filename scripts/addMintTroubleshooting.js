const { 
    Client, 
    ContractId, 
    ContractExecuteTransaction, 
    AccountId, 
    TokenId, 
    PrivateKey, 
    ContractCallQuery 
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

/**
 * This script troubleshoots the mint function by checking:
 * 1. Token associations for the contract
 * 2. Treasury LYNX balance
 * 3. Treasury LYNX allowance for the contract
 * 4. Token addresses in the contract
 */
async function troubleshootMint() {
    try {
        console.log("=== LYNX Minter Troubleshooting ===");
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
        console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        // Setup client
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
        const client = Client.forTestnet().setOperator(operatorId, operatorKey);

        // Convert contract and token IDs
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
        
        // 1. Check Treasury LYNX Balance
        console.log("\n=== Checking Treasury LYNX Balance ===");
        
        const treasuryBalanceTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("getTreasuryLynxBalance")
            .execute(client);
        
        const treasuryBalanceRecord = await treasuryBalanceTx.getRecord(client);
        const treasuryBalance = treasuryBalanceRecord.contractFunctionResult.getUint256(0);
        console.log(`Treasury LYNX balance: ${treasuryBalance.toString()}`);
        
        // 2. Check Treasury LYNX Allowance for the contract
        console.log("\n=== Checking Treasury LYNX Allowance ===");
        
        const treasuryAllowanceTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("getTreasuryLynxAllowance")
            .execute(client);
        
        const treasuryAllowanceRecord = await treasuryAllowanceTx.getRecord(client);
        const treasuryAllowance = treasuryAllowanceRecord.contractFunctionResult.getUint256(0);
        console.log(`Treasury LYNX allowance for contract: ${treasuryAllowance.toString()}`);
        
        // 3. Check Token Addresses in Contract
        console.log("\n=== Checking Token Addresses in Contract ===");
        
        // Check LYNX token address
        const lynxAddressTx = await new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("LYNX_TOKEN")
            .execute(client);
        
        const lynxAddress = `0x${lynxAddressTx.asBytes().toString('hex').slice(-40)}`;
        console.log(`LYNX token address in contract: ${lynxAddress}`);
        
        // Check SAUCE token address
        const sauceAddressTx = await new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("SAUCE_TOKEN")
            .execute(client);
        
        const sauceAddress = `0x${sauceAddressTx.asBytes().toString('hex').slice(-40)}`;
        console.log(`SAUCE token address in contract: ${sauceAddress}`);
        
        // Check CLXY token address
        const clxyAddressTx = await new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("CLXY_TOKEN")
            .execute(client);
        
        const clxyAddress = `0x${clxyAddressTx.asBytes().toString('hex').slice(-40)}`;
        console.log(`CLXY token address in contract: ${clxyAddress}`);
        
        // Check TREASURY address
        const treasuryAddressTx = await new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("TREASURY_ACCOUNT")
            .execute(client);
        
        const treasuryAddress = `0x${treasuryAddressTx.asBytes().toString('hex').slice(-40)}`;
        console.log(`TREASURY address in contract: ${treasuryAddress}`);
        
        // Convert account IDs to Solidity addresses for comparison
        const operatorSolidityAddress = operatorId.toSolidityAddress();
        console.log(`\nOperator/Treasury Solidity address: ${operatorSolidityAddress}`);
        
        const lynxTokenSolidityAddress = lynxTokenId.toSolidityAddress();
        console.log(`LYNX token Solidity address: ${lynxTokenSolidityAddress}`);
        
        // Comparison
        console.log("\n=== Comparisons ===");
        console.log(`Treasury match: ${treasuryAddress.toLowerCase() === operatorSolidityAddress.toLowerCase()}`);
        console.log(`LYNX token match: ${lynxAddress.toLowerCase() === lynxTokenSolidityAddress.toLowerCase()}`);
        
        // 4. Check Token Ratios
        console.log("\n=== Checking Token Ratios ===");
        
        // Get HBAR ratio
        const hbarRatioTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getHbarRatio")
            .execute(client);
        
        const hbarRatioRecord = await hbarRatioTx.getRecord(client);
        const hbarRatio = hbarRatioRecord.contractFunctionResult.getUint256(0);
        
        // Get SAUCE ratio
        const sauceRatioTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getSauceRatio")
            .execute(client);
        
        const sauceRatioRecord = await sauceRatioTx.getRecord(client);
        const sauceRatio = sauceRatioRecord.contractFunctionResult.getUint256(0);
        
        // Get CLXY ratio
        const clxyRatioTx = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("getClxyRatio")
            .execute(client);
        
        const clxyRatioRecord = await clxyRatioTx.getRecord(client);
        const clxyRatio = clxyRatioRecord.contractFunctionResult.getUint256(0);
        
        console.log(`HBAR ratio: ${hbarRatio.toString()}`);
        console.log(`SAUCE ratio: ${sauceRatio.toString()}`);
        console.log(`CLXY ratio: ${clxyRatio.toString()}`);
        
        console.log("\n=== Troubleshooting Complete ===");
    } catch (error) {
        console.error("Error in troubleshooting:", error);
        console.error("Error message:", error.message);
    }
}

// Run the troubleshooting function
troubleshootMint()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    }); 