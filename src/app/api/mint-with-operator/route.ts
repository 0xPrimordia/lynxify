import { NextResponse } from 'next/server';
import { 
    Client, 
    AccountId, 
    PrivateKey, 
    TokenMintTransaction,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractId,
    TokenId,
    ContractCallQuery,
    Hbar,
    AccountBalanceQuery
} from '@hashgraph/sdk';

export async function POST(request: Request) {
    try {
        const { hbarAmount, sauceAmount, clxyAmount } = await request.json();
        
        if (!hbarAmount) {
            return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
        }

        // Get contract ID and token IDs
        const contractId = ContractId.fromString(process.env.LYNX_CONTRACT_ADDRESS!);
        const lynxTokenId = process.env.LYNX_TOKEN_ID!;
        const sauceTokenId = process.env.SAUCE_TOKEN_ID!; 
        const clxyTokenId = process.env.CLXY_TOKEN_ID!;   

        // Convert to number - all tokens have 8 decimals
        const hbarValue = Math.floor(parseFloat(hbarAmount) * 1e8);
        const sauceValue = Math.floor(parseFloat(sauceAmount) * 1e8);
        const clxyValue = Math.floor(parseFloat(clxyAmount) * 1e8);
        
        console.log('Starting mint process with values:', {
            hbarValue: hbarValue.toString(),
            sauceValue: sauceValue.toString(),
            clxyValue: clxyValue.toString(),
            contractId: contractId.toString(),
            lynxTokenId,
            sauceTokenId,
            clxyTokenId
        });

        // Initialize Hedera client with operator account
        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
        const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY!);
        const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' 
            ? Client.forMainnet() 
            : Client.forTestnet();
        client.setOperator(operatorId, operatorKey);

        // First approve SAUCE token
        const approveSauceTx = new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(sauceTokenId))
            .setGas(1000000)
            .setFunction(
                "approve",
                new ContractFunctionParameters()
                    .addAddress(contractId.toSolidityAddress())
                    .addUint256(sauceValue)
            );
        
        const approveSauceResponse = await approveSauceTx.execute(client);
        await approveSauceResponse.getReceipt(client);
        console.log("SAUCE token approved");

        // Then approve CLXY token
        const approveClxyTx = new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(clxyTokenId))
            .setGas(1000000)
            .setFunction(
                "approve",
                new ContractFunctionParameters()
                    .addAddress(contractId.toSolidityAddress())
                    .addUint256(clxyValue)
            );
        
        const approveClxyResponse = await approveClxyTx.execute(client);
        await approveClxyResponse.getReceipt(client);
        console.log("CLXY token approved");

        // Execute mint transaction
        const mintTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setPayableAmount(new Hbar(parseFloat(hbarAmount)))
            .setFunction(
                "mint",
                new ContractFunctionParameters()
                    .addUint256(hbarValue)
            );
        
        const mintResponse = await mintTx.execute(client);
        const mintReceipt = await mintResponse.getReceipt(client);
        console.log("Mint transaction executed:", mintReceipt.status.toString());
        
        // Get the current nonce from the contract
        const nonceQuery = new ContractCallQuery()
            .setContractId(contractId)
            .setGas(100000)
            .setFunction("mintNonce");
        
        const nonceResult = await nonceQuery.execute(client);
        const currentNonce = nonceResult.getUint256(0);
        const previousNonce = currentNonce.toNumber() - 1;
        console.log("Current nonce:", currentNonce.toString());
        console.log("Using previous nonce for confirmation:", previousNonce);
        
        // Mint LYNX tokens
        const mintLynxTx = new TokenMintTransaction()
            .setTokenId(TokenId.fromString(lynxTokenId))
            .setAmount(hbarValue)
            .setMaxTransactionFee(new Hbar(2));
        
        const mintLynxResponse = await mintLynxTx.execute(client);
        const mintLynxReceipt = await mintLynxResponse.getReceipt(client);
        console.log("LYNX tokens minted:", mintLynxReceipt.status.toString());
        
        // Confirm the mint in the contract
        const confirmMintTx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(1000000)
            .setFunction(
                "confirmMint",
                new ContractFunctionParameters()
                    .addUint256(previousNonce)
                    .addUint256(hbarValue)
            );
        
        const confirmMintResponse = await confirmMintTx.execute(client);
        const confirmMintReceipt = await confirmMintResponse.getReceipt(client);
        console.log("Mint confirmed:", confirmMintReceipt.status.toString());
        
        return NextResponse.json({ 
            success: true, 
            transactionId: mintResponse.transactionId.toString(),
            confirmTransactionId: confirmMintResponse.transactionId.toString()
        });
    } catch (error: any) {
        console.error('Mint error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message 
        }, { status: 500 });
    }
} 