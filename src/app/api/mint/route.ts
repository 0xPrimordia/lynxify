import { NextResponse } from 'next/server';
import { Client, ContractId, ContractExecuteTransaction, ContractFunctionParameters, AccountId, TransactionId, Hbar, ContractCallQuery } from '@hashgraph/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';

export async function POST(req: Request) {
    try {
        const { hbarAmount, sauceAmount, clxyAmount, lynxAmount, accountId, step = 1 } = await req.json();

        // Check if required environment variables are set
        if (!process.env.LYNX_CONTRACT_ADDRESS || !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID) {
            throw new Error('Missing required environment variables');
        }

        // Convert amounts to contract format (we use the raw amount as the contract already handles the correct units)
        const lynxValue = Math.floor(parseFloat(lynxAmount) * 1e8);
        
        const client = Client.forTestnet();
            
        const senderAccountId = AccountId.fromString(accountId);
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        const contractAddress = contractId.toSolidityAddress();

        let transaction: ContractExecuteTransaction | null = null;
        let description: string = '';

        // Return different transactions based on the step
        if (step === 1) {
            // Calculate required SAUCE amount using the contract
            const sauceQuery = new ContractCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("calculateRequiredSAUCE", new ContractFunctionParameters().addUint256(lynxValue))
                .setQueryPayment(new Hbar(0.01));
            
            const sauceResult = await sauceQuery.execute(client);
            const sauceValue = sauceResult.getUint256(0);
            
            console.log('Contract calculation for SAUCE:', {
                lynxValue,
                sauceValue: sauceValue.toString()
            });
            
            // Step 1: Approve SAUCE tokens
            transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(process.env.SAUCE_TOKEN_ID))
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
            // Calculate required CLXY amount using the contract
            const clxyQuery = new ContractCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("calculateRequiredCLXY", new ContractFunctionParameters().addUint256(lynxValue))
                .setQueryPayment(new Hbar(0.01));
            
            const clxyResult = await clxyQuery.execute(client);
            const clxyValue = clxyResult.getUint256(0);
            
            console.log('Contract calculation for CLXY:', {
                lynxValue,
                clxyValue: clxyValue.toString()
            });
            
            // Step 2: Approve CLXY tokens
            transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(process.env.CLXY_TOKEN_ID))
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
            // Calculate required HBAR amount using the contract
            const hbarQuery = new ContractCallQuery()
                .setContractId(contractId)
                .setGas(100000)
                .setFunction("calculateRequiredHBAR", new ContractFunctionParameters().addUint256(lynxValue))
                .setQueryPayment(new Hbar(0.01));
            
            const hbarResult = await hbarQuery.execute(client);
            const exactHbarRequired = hbarResult.getUint256(0);
            
            console.log('Contract calculation for HBAR:', {
                lynxValue,
                exactHbarRequired: exactHbarRequired.toString()
            });
            
            // Create transaction with exact HBAR amount
            transaction = new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(2000000)
                .setFunction(
                    "mint",
                    new ContractFunctionParameters()
                        .addUint256(lynxValue)
                )
                .setPayableAmount(Hbar.fromTinybars(exactHbarRequired))
                .setTransactionId(TransactionId.generate(senderAccountId))
                .freezeWith(client);
            
            description = `Mint ${lynxAmount} LYNX tokens`;
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