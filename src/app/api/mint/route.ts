import { NextResponse } from 'next/server';
import { Client, ContractId, ContractExecuteTransaction, ContractFunctionParameters, AccountId, TransactionId } from '@hashgraph/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';

export async function POST(req: Request) {
    try {
        const { hbarAmount, sauceAmount, clxyAmount, accountId } = await req.json();

        // Convert amounts to contract format (8 decimals as per RATIO_PRECISION)
        const hbarValue = Math.floor(parseFloat(hbarAmount) * 1e8);
        const sauceValue = Math.floor(parseFloat(sauceAmount) * 1e8);
        const clxyValue = Math.floor(parseFloat(clxyAmount) * 1e8);

        const client = Client.forTestnet();
            
        const senderAccountId = AccountId.fromString(accountId);
        const contractAddress = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS!).toSolidityAddress();

        // First approve SAUCE
        const approveSauceTx = new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(process.env.SAUCE_TOKEN_ID!))
            .setGas(1000000)
            .setFunction(
                "approve",
                new ContractFunctionParameters()
                    .addAddress(contractAddress)
                    .addUint256(sauceValue)
            )
            .setTransactionId(TransactionId.generate(senderAccountId))
            .freezeWith(client);

        const encodedTx = transactionToBase64String(approveSauceTx);
        return NextResponse.json({ transaction: encodedTx });

    } catch (error: any) {
        console.error('Mint error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 