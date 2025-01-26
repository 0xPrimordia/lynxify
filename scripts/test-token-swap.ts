import {
    Client,
    AccountId,
    PrivateKey,
    ContractId,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    AccountInfoQuery,
    TokenId,
    TransactionId,
    AccountBalanceQuery
} from "@hashgraph/sdk";
import { ethers } from 'ethers';
import SwapRouterAbi from '../src/app/lib/abis/SwapRouter.json';
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

// Validate environment variables
if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
    throw new Error("Environment variables OPERATOR_ID and OPERATOR_KEY must be present");
}

const swapRouterAbi = new ethers.Interface(SwapRouterAbi);

async function checkTokenAssociation(client: Client, accountId: AccountId, tokenId: string) {
    const accountInfo = await new AccountInfoQuery()
        .setAccountId(accountId)
        .execute(client);
    
    const tokenRelationship = accountInfo.tokenRelationships.get(TokenId.fromString(tokenId));
    return tokenRelationship !== undefined;
}

async function main() {
    // Initialize client
    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!),
        PrivateKey.fromString(process.env.OPERATOR_KEY!)
    );

    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
    
    // Test parameters
    const SAUCE_TOKEN = "0.0.1183558";
    const CLXY_TOKEN = "0.0.5365";
    const ROUTER_ADDRESS = "0.0.1414040";
    const FEE = 3000;
    const AMOUNT_IN = "10"; // 10 SAUCE tokens
    
    try {
        // Check token associations
        console.log('Checking token associations...');
        const sauceAssociated = await checkTokenAssociation(client, operatorId, SAUCE_TOKEN);
        const clxyAssociated = await checkTokenAssociation(client, operatorId, CLXY_TOKEN);
        
        console.log('Token associations:', {
            SAUCE: sauceAssociated,
            CLXY: clxyAssociated
        });

        // Check current balances
        const balancesBefore = await new AccountBalanceQuery()
            .setAccountId(operatorId)
            .execute(client);
        console.log('Balances before swap:', balancesBefore.tokens?.toString());

        // Construct path
        const path = Buffer.concat([
            Buffer.from(ContractId.fromString(SAUCE_TOKEN).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(FEE.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(ContractId.fromString(CLXY_TOKEN).toSolidityAddress().replace('0x', ''), 'hex')
        ]);

        // ExactInputParams
        const params = {
            path: path,
            recipient: operatorId.toSolidityAddress(),
            deadline: Math.floor(Date.now() / 1000) + 300,
            amountIn: (Number(AMOUNT_IN) * Math.pow(10, 6)).toString(), // SAUCE has 6 decimals
            amountOutMinimum: '0' // For testing, we set no minimum
        };

        // Create swap call
        const swapEncoded = swapRouterAbi.encodeFunctionData('exactInput', [params]);

        // Execute swap
        console.log('Executing swap transaction...');
        const swapTx = await new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(ROUTER_ADDRESS))
            .setGas(3_000_000)
            .setFunctionParameters(Buffer.from(swapEncoded.slice(2), 'hex'))
            .setTransactionId(TransactionId.generate(operatorId.toString()))
            .execute(client);

        const record = await swapTx.getRecord(client);
        
        console.log('Swap transaction result:', {
            status: record.receipt.status.toString(),
            gasUsed: record.contractFunctionResult?.gasUsed?.toString(),
            error: record.contractFunctionResult?.errorMessage,
        });

        // Check final balances
        const balancesAfter = await new AccountBalanceQuery()
            .setAccountId(operatorId)
            .execute(client);
        console.log('Balances after swap:', balancesAfter.tokens?.toString());

    } catch (error) {
        console.error('Error executing swap:', error);
    }
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    }); 