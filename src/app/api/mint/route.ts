import { NextResponse } from 'next/server';
import { Client, ContractId, ContractExecuteTransaction, ContractFunctionParameters, AccountId, TransactionId, Hbar } from '@hashgraph/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';

export async function POST(req: Request) {
    try {
        const { hbarAmount, sauceAmount, clxyAmount, lynxAmount, accountId, step = 1 } = await req.json();

        // Convert amounts to contract format (8 decimals as per RATIO_PRECISION)
        const hbarValue = Math.floor(parseFloat(hbarAmount) * 1e8);
        const sauceValue = Math.floor(parseFloat(sauceAmount) * 1e8);
        const clxyValue = Math.floor(parseFloat(clxyAmount) * 1e8);
        const lynxValue = Math.floor(parseFloat(lynxAmount) * 1e8);

        const client = Client.forTestnet();
            
        const senderAccountId = AccountId.fromString(accountId);
        const contractAddress = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS!).toSolidityAddress();

        let transaction: ContractExecuteTransaction | null = null;
        let description: string = '';

        // Return different transactions based on the step
        if (step === 1) {
            // Step 1: Approve SAUCE tokens
            transaction = new ContractExecuteTransaction()
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
            description = `Approve ${sauceAmount} SAUCE for LYNX minting`;
        } 
        else if (step === 2) {
            // Step 2: Approve CLXY tokens
            transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(process.env.CLXY_TOKEN_ID!))
                .setGas(1000000)
                .setFunction(
                    "approve",
                    new ContractFunctionParameters()
                        .addAddress(contractAddress)
                        .addUint256(clxyValue)
                )
                .setTransactionId(TransactionId.generate(senderAccountId))
                .freezeWith(client);
            description = `Approve ${clxyAmount} CLXY for LYNX minting`;
        }
        else if (step === 3) {
            // Step 3: Execute mint
            
            // Important: The contract expects the LYNX amount in the same unit system as HBAR
            // Instead of sending lynxValue (20000000), we need to send 2000000000
            // This is because the contract calculates hbarRequired = lynxAmount * 10
            
            // Instead of using lynxValue directly, use hbarRequired / 10 
            // This keeps the units in tinybars consistent with what the contract expects
            const contractLynxValue = Math.floor(parseFloat(hbarAmount) * 1e9); // Adjust the scale
            
            transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS!))
                .setGas(2000000)
                .setFunction(
                    "mint",
                    new ContractFunctionParameters()
                        .addUint256(contractLynxValue)
                )
                .setPayableAmount(new Hbar(parseFloat(hbarAmount)))
                .setTransactionId(TransactionId.generate(senderAccountId))
                .freezeWith(client);
            
            description = `Mint ${lynxAmount} LYNX tokens`;
            
            // Return debug info in the response
            return NextResponse.json({ 
                transaction: transactionToBase64String(transaction),
                step,
                totalSteps: 3,
                description,
                nextStep: step < 3 ? step + 1 : null,
                debug: {
                    lynxAmount,
                    hbarAmount,
                    lynxValue,
                    contractLynxValue,
                    hbarRequired: contractLynxValue * 10,
                    payableAmountString: new Hbar(parseFloat(hbarAmount)).toString(),
                    actualTinybars: new Hbar(parseFloat(hbarAmount)).toTinybars().toString()
                }
            });
        }

        if (!transaction) {
            throw new Error(`Invalid step: ${step}`);
        }

        const encodedTx = transactionToBase64String(transaction);
        
        return NextResponse.json({ 
            transaction: encodedTx,
            step,
            totalSteps: 3,
            description,
            nextStep: step < 3 ? step + 1 : null
        });

    } catch (error: any) {
        console.error('Mint error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 