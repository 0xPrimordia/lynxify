import { NextResponse } from 'next/server';
import { Client, ContractId, ContractExecuteTransaction, ContractFunctionParameters, AccountId, TransactionId, Hbar, ContractCallQuery, PrivateKey } from '@hashgraph/sdk';
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import BigNumber from 'bignumber.js';

export async function POST(req: Request) {
    try {
        const { hbarAmount, sauceAmount, clxyAmount, lynxAmount, accountId, step = 1, isExtensionWallet = false } = await req.json();

        // Check if required environment variables are set
        if (!process.env.LYNX_CONTRACT_ADDRESS || !process.env.SAUCE_TOKEN_ID || !process.env.CLXY_TOKEN_ID || !process.env.LYNX_TOKEN_ID) {
            throw new Error('Missing required environment variables');
        }

        // Convert amounts to contract format with improved precision handling
        const rawLynxValue = Math.floor(parseFloat(lynxAmount) * 100000000);
        const lynxValue = new BigNumber(rawLynxValue);
        
        // Initialize client
        const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
        
        const senderAccountId = AccountId.fromString(accountId);
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS);
        const contractAddress = contractId.toSolidityAddress();

        // Validate contract ID format
        if (!contractId.toString().match(/^0\.0\.\d+$/)) {
            throw new Error('Invalid contract ID format');
        }

        let transaction: ContractExecuteTransaction | null = null;
        let description: string = '';

        // For queries, we need to set an operator if we're handling extension wallet requests
        if (process.env.NEXT_PUBLIC_OPERATOR_ID && process.env.OPERATOR_KEY) {
            const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
            const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY);
            client.setOperator(operatorId, operatorKey);
        }

        // Return different transactions based on the step
        if (step === 1) {
            // Calculate required SAUCE amount using the contract
            const sauceQuery = new ContractCallQuery()
                .setContractId(contractId)
                .setGas(300000) // Increased gas for testnet
                .setFunction("calculateRequiredSAUCE", new ContractFunctionParameters().addUint256(lynxValue))
                .setQueryPayment(new Hbar(0.01));
            
            const sauceResult = await sauceQuery.execute(client);
            const sauceValue = sauceResult.getUint256(0);
            
            console.log('Contract calculation for SAUCE:', {
                lynxValue: lynxValue.toString(),
                sauceValue: sauceValue.toString()
            });
            
            // Step 1: Approve SAUCE tokens
            transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(process.env.SAUCE_TOKEN_ID))
                .setGas(1500000) // Increased gas for testnet
                .setFunction(
                    "approve",
                    new ContractFunctionParameters()
                        .addAddress(contractAddress)
                        .addUint256(sauceValue)
                );
            
            // For ALL transactions, set ID and max fee
            transaction = transaction
                .setTransactionId(TransactionId.generate(senderAccountId))
                .setMaxTransactionFee(new Hbar(5));
            
            // Only freeze for in-app wallets
            if (!isExtensionWallet) {
                transaction = transaction.freezeWith(client);
            }
                
            description = `Approve ${sauceAmount} SAUCE for LYNX minting`;
        } 
        else if (step === 2) {
            // Calculate required CLXY amount using the contract
            const clxyQuery = new ContractCallQuery()
                .setContractId(contractId)
                .setGas(300000) // Increased gas for testnet
                .setFunction("calculateRequiredCLXY", new ContractFunctionParameters().addUint256(lynxValue))
                .setQueryPayment(new Hbar(0.01));
            
            const clxyResult = await clxyQuery.execute(client);
            const clxyValue = clxyResult.getUint256(0);
            
            console.log('Contract calculation for CLXY:', {
                lynxValue: lynxValue.toString(),
                clxyValue: clxyValue.toString()
            });
            
            // Step 2: Approve CLXY tokens
            transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(process.env.CLXY_TOKEN_ID))
                .setGas(1500000) // Increased gas for testnet
                .setFunction(
                    "approve",
                    new ContractFunctionParameters()
                        .addAddress(contractAddress)
                        .addUint256(clxyValue)
                );
            
            // For ALL transactions, set ID and max fee
            transaction = transaction
                .setTransactionId(TransactionId.generate(senderAccountId))
                .setMaxTransactionFee(new Hbar(5));
            
            // Only freeze for in-app wallets
            if (!isExtensionWallet) {
                transaction = transaction.freezeWith(client);
            }
                
            description = `Approve ${clxyAmount} CLXY for LYNX minting`;
        }
        else if (step === 3) {
            // Calculate required HBAR amount using the contract
            const hbarQuery = new ContractCallQuery()
                .setContractId(contractId)
                .setGas(300000) // Increased gas for testnet
                .setFunction("calculateRequiredHBAR", new ContractFunctionParameters().addUint256(lynxValue))
                .setQueryPayment(new Hbar(0.01));
            
            const hbarResult = await hbarQuery.execute(client);
            const exactHbarRequired = hbarResult.getUint256(0);
            
            console.log('Contract calculation for HBAR:', {
                lynxValue: lynxValue.toString(),
                exactHbarRequired: exactHbarRequired.toString()
            });
            
            // Create transaction with exact HBAR amount
            transaction = new ContractExecuteTransaction()
                .setContractId(contractId)
                .setGas(3000000) // Increased gas for testnet
                .setFunction(
                    "mint",
                    new ContractFunctionParameters()
                        .addUint256(lynxValue)
                )
                .setPayableAmount(Hbar.fromTinybars(exactHbarRequired));
            
            // For ALL transactions, set ID and max fee
            transaction = transaction
                .setTransactionId(TransactionId.generate(senderAccountId))
                .setMaxTransactionFee(new Hbar(5));
            
            // Only freeze for in-app wallets
            if (!isExtensionWallet) {
                transaction = transaction.freezeWith(client);
            }
                
            description = `Mint ${lynxAmount} LYNX tokens`;
        }

        if (!transaction) {
            throw new Error(`Invalid step: ${step}`);
        }

        // Always encode the transaction, regardless of wallet type
        const encodedTx = transactionToBase64String(transaction);
        
        console.log('Prepared transaction for extension wallet:', isExtensionWallet);
        
        return NextResponse.json({ 
            transaction: encodedTx,
            step,
            totalSteps: 3,
            description,
            nextStep: step < 3 ? step + 1 : null,
            isExtensionWallet
        });

    } catch (error: any) {
        // Enhanced error handling
        let errorMessage = error.message;
        
        if (errorMessage.includes("MustSendExactHBAR")) {
            errorMessage = "You must send exactly the required amount of HBAR for minting.";
        } else if (errorMessage.includes("InsufficientSauceAllowance")) {
            errorMessage = "Insufficient SAUCE token allowance. Please try again with step 1.";
        } else if (errorMessage.includes("InsufficientClxyAllowance")) {
            errorMessage = "Insufficient CLXY token allowance. Please try again with step 2.";
        }
        
        console.error('Mint error:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
} 