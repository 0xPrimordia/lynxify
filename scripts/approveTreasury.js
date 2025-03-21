const { Client, AccountAllowanceApproveTransaction, TokenId, AccountId, PrivateKey, ContractId } = require('@hashgraph/sdk');
require('dotenv').config({ path: './.env.local' });

async function approveContractForTreasury() {
    // Check for required environment variables
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.LYNX_CONTRACT_ADDRESS || !process.env.LYNX_TOKEN_ID) {
        throw new Error('Required environment variables are missing');
    }

    console.log('Starting treasury approval process...');
    console.log({
        NEXT_PUBLIC_OPERATOR_ID: process.env.NEXT_PUBLIC_OPERATOR_ID,
        LYNX_CONTRACT_ADDRESS: process.env.LYNX_CONTRACT_ADDRESS,
        LYNX_TOKEN_ID: process.env.LYNX_TOKEN_ID
    });
    
    // Set up the client
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_KEY);
    const client = Client.forTestnet().setOperator(operatorId, operatorKey);
    
    const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
    const lynxTokenId = TokenId.fromString(process.env.LYNX_TOKEN_ID);
    
    try {
        // Create an allowance transaction with a large approval amount
        const approvalAmount = 1000000000; // A large number to avoid frequent approvals
        
        console.log(`Approving contract ${process.env.LYNX_CONTRACT_ADDRESS} to spend ${approvalAmount} LYNX tokens from treasury ${process.env.NEXT_PUBLIC_OPERATOR_ID}`);
        console.log(`Contract Solidity address: ${contractId.toSolidityAddress()}`);
        
        // Create the approval transaction
        const approveTransaction = new AccountAllowanceApproveTransaction()
            .approveTokenAllowance(
                lynxTokenId,        // Token ID
                operatorId,         // Owner of the tokens
                contractId,         // Spender (the contract)
                approvalAmount      // Amount to approve
            )
            .freezeWith(client);
        
        // Sign the transaction
        const signedTx = await approveTransaction.sign(operatorKey);
        
        // Execute the signed transaction
        const approveSubmit = await signedTx.execute(client);
        
        // Get the receipt
        const approveReceipt = await approveSubmit.getReceipt(client);
        
        console.log(`Treasury approval status: ${approveReceipt.status.toString()}`);
        
        if (approveReceipt.status.toString() === 'SUCCESS') {
            console.log(`Successfully approved contract to spend ${approvalAmount} LYNX tokens from treasury!`);
        } else {
            console.error('Failed to approve contract for treasury tokens');
        }
    } catch (error) {
        console.error('Error in treasury approval process:', error);
        console.error(error.message);
        if (error.transactionId) {
            console.log('Transaction ID:', error.transactionId.toString());
        }
    }
    
    console.log('Treasury approval process completed');
}

// Execute the function
approveContractForTreasury()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 