const {
    Client,
    ContractId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractCallQuery,
    Hbar,
    AccountId,
    TokenId,
    TransactionRecordQuery
} = require("@hashgraph/sdk");
require("dotenv").config({ path: ".env.local" });

async function traceContract() {
    try {
        console.log("Starting contract trace process...");
        
        // Log relevant environment variables
        console.log("Environment variables:");
        console.log("NEXT_PUBLIC_OPERATOR_ID:", process.env.NEXT_PUBLIC_OPERATOR_ID);
        console.log("LYNX_CONTRACT_ADDRESS:", process.env.LYNX_CONTRACT_ADDRESS);
        console.log("SAUCE_TOKEN_ID:", process.env.SAUCE_TOKEN_ID);
        console.log("CLXY_TOKEN_ID:", process.env.CLXY_TOKEN_ID);
        console.log("LYNX_TOKEN_ID:", process.env.LYNX_TOKEN_ID);

        if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.LYNX_CONTRACT_ADDRESS || 
            !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
            throw new Error("Missing environment variables");
        }

        // Setup client
        const client = Client.forTestnet();
        client.setOperator(process.env.NEXT_PUBLIC_OPERATOR_ID, process.env.OPERATOR_KEY);

        // Convert IDs to proper Solidity address format
        const lynxContractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        const lynxContractSolidityAddress = lynxContractId.toSolidityAddress();
        console.log("LYNX contract Solidity address:", lynxContractSolidityAddress);

        // Check if LYNX token is properly created and if we have mint capability
        await checkLynxTokenProperties(client);

        // Test if account has permission to mint
        console.log("Checking contract mint permission for LYNX token...");
        
        // Amount of LYNX to mint in trace (very tiny amount)
        const mintAmount = 0.001 * 100000000; // 8 decimal places
        
        // Calculate required amounts
        const hbarRatio = 10;
        const sauceRatio = 5;
        const clxyRatio = 2;
        
        const hbarRequired = mintAmount * hbarRatio;
        const sauceRequired = mintAmount * sauceRatio;
        const clxyRequired = mintAmount * clxyRatio;
        
        console.log(`For minting ${mintAmount/100000000} LYNX:`);
        console.log(`- HBAR required: ${hbarRequired/100000000} (${hbarRequired} tinybars)`);
        console.log(`- SAUCE required: ${sauceRequired/100000000} (${sauceRequired} units)`);
        console.log(`- CLXY required: ${clxyRequired/100000000} (${clxyRequired} units)`);

        // Approve SAUCE
        console.log(`Approving SAUCE tokens (${sauceRequired} units)...`);
        const sauceApproveTransaction = await new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(process.env.SAUCE_TOKEN_ID))
            .setGas(1000000)
            .setFunction(
                "approve",
                new ContractFunctionParameters()
                    .addAddress(lynxContractSolidityAddress)
                    .addUint256(sauceRequired)
            )
            .execute(client);
        
        const sauceApproveReceipt = await sauceApproveTransaction.getReceipt(client);
        console.log("SAUCE approval status:", sauceApproveReceipt.status.toString());

        // Approve CLXY
        console.log(`Approving CLXY tokens (${clxyRequired} units)...`);
        const clxyApproveTransaction = await new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(process.env.CLXY_TOKEN_ID))
            .setGas(1000000)
            .setFunction(
                "approve",
                new ContractFunctionParameters()
                    .addAddress(lynxContractSolidityAddress)
                    .addUint256(clxyRequired)
            )
            .execute(client);
        
        const clxyApproveReceipt = await clxyApproveTransaction.getReceipt(client);
        console.log("CLXY approval status:", clxyApproveReceipt.status.toString());

        // Check allowances to confirm approvals
        await checkAllowances(client, lynxContractSolidityAddress);

        // Execute mint with trace record
        console.log(`Attempting to mint ${mintAmount/100000000} LYNX with ${hbarRequired/100000000} HBAR...`);
        const mintTransaction = new ContractExecuteTransaction()
            .setContractId(lynxContractId)
            .setGas(3000000)
            .setFunction(
                "mint",
                new ContractFunctionParameters()
                    .addUint256(mintAmount)
            )
            .setPayableAmount(Hbar.fromTinybars(hbarRequired))
            .setMaxTransactionFee(new Hbar(50));
        
        try {
            // Execute the transaction and get detailed record
            const txResponse = await mintTransaction.execute(client);
            console.log("Transaction response received, attempting to get record...");
            
            // Get the transaction record which has more details than receipt
            const record = await txResponse.getRecord(client);
            
            // Get the receipt after the record for status
            const mintReceipt = await txResponse.getReceipt(client);
            console.log("LYNX mint status:", mintReceipt.status.toString());
            
            // Check the contract function result for more details
            if (record.contractFunctionResult) {
                const result = record.contractFunctionResult;
                console.log("Contract result:", result);
                console.log("Error message in result:", result.errorMessage);
                
                if (result.logs) {
                    console.log("Contract logs:", result.logs);
                }
            }
            
            if (mintReceipt.status.toString() === "SUCCESS") {
                console.log(`Successfully minted ${mintAmount/100000000} LYNX tokens!`);
            } else {
                console.error("Failed to mint LYNX tokens. Status:", mintReceipt.status.toString());
            }
        } catch (error) {
            console.error("Mint transaction failed:", error.message);
            
            // Try to get transaction ID and record for more details
            if (error.transactionId) {
                console.log("Transaction ID for failed mint:", error.transactionId.toString());
                
                try {
                    // Try to get the record for the failed transaction
                    console.log("Attempting to get transaction record for more details...");
                    const recordQuery = new TransactionRecordQuery()
                        .setTransactionId(error.transactionId);
                    
                    const record = await recordQuery.execute(client);
                    console.log("Transaction record obtained.");
                    
                    if (record && record.contractFunctionResult) {
                        console.log("Contract revert reason:", record.contractFunctionResult.errorMessage || "Not available");
                    }
                } catch (recordError) {
                    console.error("Could not get transaction record:", recordError.message);
                }
            }
        }

        console.log("Contract trace completed.");
    } catch (error) {
        console.error("Error in traceContract function:", error.message);
        if (error.stack) {
            console.error("Stack trace:", error.stack);
        }
    }
}

async function checkLynxTokenProperties(client) {
    try {
        console.log("Checking LYNX token properties...");
        
        // Use mirror node to get token info
        const response = await fetch(
            `https://testnet.mirrornode.hedera.com/api/v1/tokens/${process.env.LYNX_TOKEN_ID}`
        );
        
        if (!response.ok) {
            console.error("Error fetching token info:", response.statusText);
            return;
        }
        
        const tokenData = await response.json();
        console.log("LYNX token info:");
        console.log("- Name:", tokenData.name);
        console.log("- Symbol:", tokenData.symbol);
        console.log("- Decimals:", tokenData.decimals);
        console.log("- Supply Key:", tokenData.supply_key?.key);
        console.log("- Treasury:", tokenData.treasury_account_id);
        
        // Check if contract address is admin or has supply permission
        const contractId = process.env.LYNX_CONTRACT_ADDRESS;
        const hasSupplyPermission = tokenData.supply_key?.key === contractId;
        
        console.log("Contract has supply permission:", hasSupplyPermission);
        
        if (!hasSupplyPermission) {
            console.warn("WARNING: The contract does not appear to have supply permissions for the LYNX token!");
            console.warn("The mint function will likely fail because the contract cannot mint tokens.");
        }
    } catch (error) {
        console.error("Error checking token properties:", error.message);
    }
}

async function checkAllowances(client, contractAddress) {
    try {
        console.log("Checking token allowances...");
        
        // Check SAUCE allowance
        const sauceAllowanceQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(process.env.SAUCE_TOKEN_ID))
            .setGas(100000)
            .setFunction(
                "allowance",
                new ContractFunctionParameters()
                    .addAddress(AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID).toSolidityAddress())
                    .addAddress(contractAddress)
            );
        
        const sauceAllowanceResult = await sauceAllowanceQuery.execute(client);
        const sauceAllowance = sauceAllowanceResult.getUint256(0);
        console.log("SAUCE allowance for contract:", sauceAllowance.toString() / 100000000);
        
        // Check CLXY allowance
        const clxyAllowanceQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(process.env.CLXY_TOKEN_ID))
            .setGas(100000)
            .setFunction(
                "allowance",
                new ContractFunctionParameters()
                    .addAddress(AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID).toSolidityAddress())
                    .addAddress(contractAddress)
            );
        
        const clxyAllowanceResult = await clxyAllowanceQuery.execute(client);
        const clxyAllowance = clxyAllowanceResult.getUint256(0);
        console.log("CLXY allowance for contract:", clxyAllowance.toString() / 100000000);
    } catch (error) {
        console.error("Error checking allowances:", error.message);
    }
}

// Run the function and ensure the script exits
traceContract()
    .then(() => {
        console.log("Script execution completed.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error in script execution:", error);
        process.exit(1);
    }); 