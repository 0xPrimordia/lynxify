const { Client, ContractExecuteTransaction, ContractId, AccountId, TokenId, Hbar, PrivateKey, TransferTransaction, TokenInfoQuery, ContractFunctionParameters } = require('@hashgraph/sdk');
require('dotenv').config({ path: './.env.local' });

const main = async () => {
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.LYNX_CONTRACT_ADDRESS || 
        !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID ||
        !process.env.OPERATOR_KEY) {
        throw new Error('Required environment variables are missing');
    }

    console.log('Starting mint test...');
    console.log({
        NEXT_PUBLIC_OPERATOR_ID: process.env.NEXT_PUBLIC_OPERATOR_ID,
        LYNX_CONTRACT_ADDRESS: process.env.LYNX_CONTRACT_ADDRESS,
        SAUCE_TOKEN_ID: process.env.SAUCE_TOKEN_ID,
        CLXY_TOKEN_ID: process.env.CLXY_TOKEN_ID,
        LYNX_TOKEN_ID: process.env.LYNX_TOKEN_ID
    });

    // Set up the client
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);
    
    // Define contract and token IDs
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    const sauceTokenId = TokenId.fromString(process.env.SAUCE_TOKEN_ID);
    const clxyTokenId = TokenId.fromString(process.env.CLXY_TOKEN_ID);
    
    // Check treasury balance before mint
    try {
        const treasuryBalanceCheck = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("getTreasuryLynxBalance")
            .execute(client);
        
        const treasuryBalanceRecord = await treasuryBalanceCheck.getRecord(client);
        const treasuryBalance = treasuryBalanceRecord.contractFunctionResult.getUint256(0);
        console.log(`Treasury LYNX balance: ${treasuryBalance.toString()}`);
        
        // Check contract's allowance to spend treasury's LYNX
        const allowanceCheck = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("getTreasuryLynxAllowance")
            .execute(client);
        
        const allowanceRecord = await allowanceCheck.getRecord(client);
        const allowance = allowanceRecord.contractFunctionResult.getUint256(0);
        console.log(`Contract's allowance to spend treasury's LYNX: ${allowance.toString()}`);
        
        // Prepare for mint
        console.log("Preparing for mint test...");
        const mintAmount = 10000; // 100 LYNX with 2 decimals
        
        // Get the HBAR ratio
        const hbarRatioCheck = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("getHbarRatio")
            .execute(client);
        
        const hbarRatioRecord = await hbarRatioCheck.getRecord(client);
        const hbarRatio = hbarRatioRecord.contractFunctionResult.getUint256(0);
        console.log(`HBAR ratio: ${hbarRatio.toString()}`);
        
        // Get SAUCE ratio
        const sauceRatioCheck = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("getSauceRatio")
            .execute(client);
        
        const sauceRatioRecord = await sauceRatioCheck.getRecord(client);
        const sauceRatio = sauceRatioRecord.contractFunctionResult.getUint256(0);
        console.log(`SAUCE ratio: ${sauceRatio.toString()}`);
        
        // Get CLXY ratio
        const clxyRatioCheck = await new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(300000)
            .setFunction("getClxyRatio")
            .execute(client);
        
        const clxyRatioRecord = await clxyRatioCheck.getRecord(client);
        const clxyRatio = clxyRatioRecord.contractFunctionResult.getUint256(0);
        console.log(`CLXY ratio: ${clxyRatio.toString()}`);
        
        // Calculate amounts needed
        const requiredHbar = BigInt(mintAmount) * BigInt(hbarRatio);
        const requiredSauce = BigInt(mintAmount) * BigInt(sauceRatio);
        const requiredClxy = BigInt(mintAmount) * BigInt(clxyRatio);
        
        console.log(`Required amounts for mint:
            - HBAR: ${requiredHbar.toString()} tinybar (${Hbar.fromTinybars(Number(requiredHbar)).toString()})
            - SAUCE: ${requiredSauce.toString()} units
            - CLXY: ${requiredClxy.toString()} units
            - LYNX to receive: ${mintAmount} units`);
            
        // Approve SAUCE for the contract
        console.log("Approving SAUCE tokens for the contract...");
        const approveSauceTransaction = await new TransferTransaction()
            .addApprovedTokenTransfer(sauceTokenId, operatorId, -Number(requiredSauce))
            .addTokenApproval(sauceTokenId, contractId.toSolidityAddress(), Number(requiredSauce))
            .freezeWith(client)
            .sign(operatorKey);
        
        const approveSauceSubmit = await approveSauceTransaction.execute(client);
        const approveSauceReceipt = await approveSauceSubmit.getReceipt(client);
        console.log(`SAUCE approval status: ${approveSauceReceipt.status.toString()}`);
        
        // Approve CLXY for the contract
        console.log("Approving CLXY tokens for the contract...");
        const approveClxyTransaction = await new TransferTransaction()
            .addApprovedTokenTransfer(clxyTokenId, operatorId, -Number(requiredClxy))
            .addTokenApproval(clxyTokenId, contractId.toSolidityAddress(), Number(requiredClxy))
            .freezeWith(client)
            .sign(operatorKey);
        
        const approveClxySubmit = await approveClxyTransaction.execute(client);
        const approveClxyReceipt = await approveClxySubmit.getReceipt(client);
        console.log(`CLXY approval status: ${approveClxyReceipt.status.toString()}`);
        
        // Check if treasury needs to approve contract
        if (allowance < mintAmount) {
            console.log("Treasury needs to approve contract to spend LYNX");
            console.log("Attempting direct treasury approval using operator (if operator is treasury)");
            
            try {
                const directApproveTransaction = await new TransferTransaction()
                    .addApprovedTokenTransfer(lynxTokenId, operatorId, 0)
                    .addTokenApproval(lynxTokenId, contractId.toSolidityAddress(), Number(mintAmount))
                    .freezeWith(client)
                    .sign(operatorKey);
                
                const directApproveSubmit = await directApproveTransaction.execute(client);
                const directApproveReceipt = await directApproveSubmit.getReceipt(client);
                console.log(`Direct treasury approval status: ${directApproveReceipt.status.toString()}`);
            } catch (error) {
                console.error("Direct treasury approval failed - operator may not be treasury:");
                console.error(error.message);
            }
        }
        
        // Execute mint transaction
        console.log("Executing mint transaction...");
        try {
            const mintTransaction = await new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(3000000)
                .setFunction("mint", new ContractFunctionParameters().addUint256(mintAmount))
                .setPayableAmount(Hbar.fromTinybars(requiredHbar))
                .execute(client);
            
            const mintRecord = await mintTransaction.getRecord(client);
            console.log(`Mint transaction status: ${mintRecord.receipt.status.toString()}`);
            console.log("Mint successful!");
            
        } catch (error) {
            console.error("Mint failed:");
            console.error(error);
        }
    } catch (error) {
        console.error("Error in mint test:");
        console.error(error);
    }
    
    console.log("Mint test completed");
};

// Execute the main function
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 