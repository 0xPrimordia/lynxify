import {
  Client,
  ContractCallQuery,
  ContractId,
  AccountId,
  PrivateKey,
  ContractFunctionParameters,
  ContractExecuteTransaction
} from "@hashgraph/sdk";
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function setAndVerifyThreshold(client: Client, contractId: string, hederaAccountId: string) {
    console.log('\nSetting test threshold...');
    
    // Test values
    const stopLossBasisPoints = 700;
    const buyOrderBasisPoints = 900;
    const tokenAddress = `0x0000000000000000000000000000000000120f46`;  // Example token address
    const stopLossAmount = '100000000';
    const buyOrderAmount = '100000000';

    console.log('Setting threshold with params:', {
        stopLossBasisPoints,
        buyOrderBasisPoints,
        hederaAccountId,
        tokenAddress,
        stopLossAmount,
        buyOrderAmount
    });

    // Set threshold
    const setTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(contractId))
        .setGas(1000000)
        .setFunction("setThresholds", new ContractFunctionParameters()
            .addUint256(stopLossBasisPoints)
            .addUint256(buyOrderBasisPoints)
            .addString(hederaAccountId)
            .addAddress(tokenAddress)
            //@ts-ignore
            .addUint256(stopLossAmount)
            //@ts-ignore
            .addUint256(buyOrderAmount)
        );

    const setResponse = await setTx.execute(client);
    const receipt = await setResponse.getReceipt(client);
    console.log('Set threshold transaction:', setResponse.transactionId.toString());
    console.log('Receipt status:', receipt.status.toString());

    // Verify threshold
    console.log('\nVerifying threshold storage...');
    const query = new ContractCallQuery()
        .setContractId(ContractId.fromString(contractId))
        .setGas(100000)
        .setFunction("getThreshold", new ContractFunctionParameters().addString(hederaAccountId));

    const response = await query.execute(client);
    
    if (!response || !response.bytes) {
        console.log('No threshold data returned');
        return;
    }

    const [
        storedStopLossThreshold,
        storedBuyOrderThreshold,
        storedHederaId,
        storedTokenAddress,
        storedStopLossAmount,
        storedBuyOrderAmount,
        isActive
    ] = response.getResult([
        'uint256',
        'uint256',
        'string',
        'address',
        'uint256',
        'uint256',
        'bool'
    ]);

    console.log('Stored threshold values:', {
        stopLossThreshold: storedStopLossThreshold.toString(),
        buyOrderThreshold: storedBuyOrderThreshold.toString(),
        storedHederaId,
        tokenAddress: storedTokenAddress,
        stopLossAmount: storedStopLossAmount.toString(),
        buyOrderAmount: storedBuyOrderAmount.toString(),
        isActive
    });

    // Verify values match
    console.log('\nVerifying values match:');
    console.log('Stop Loss Threshold matches:', storedStopLossThreshold.toString() === stopLossBasisPoints.toString());
    console.log('Buy Order Threshold matches:', storedBuyOrderThreshold.toString() === buyOrderBasisPoints.toString());
    console.log('Hedera ID matches:', storedHederaId === hederaAccountId);
    console.log('Token Address matches:', storedTokenAddress.toLowerCase() === tokenAddress.toLowerCase());
    console.log('Stop Loss Amount matches:', storedStopLossAmount.toString() === stopLossAmount);
    console.log('Buy Order Amount matches:', storedBuyOrderAmount.toString() === buyOrderAmount);
    console.log('Is Active:', isActive);

    return isActive;
}

async function executeTradeForUser(client: Client, contractId: string, hederaAccountId: string) {
    console.log('\nExecuting trade...');

    const orderType = "stopLoss";
    const path = "0000000000000000000000000000000000120f46000bb800000000000000000000000000000000000014f5";

    console.log('Executing with params:', {
        hederaAccountId,
        orderType,
        path
    });

    const response = await fetch('http://localhost:3000/api/thresholds/executeOrder', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.API_KEY!,
        },
        body: JSON.stringify({
            thresholdId: 'your-threshold-id',
            orderType: orderType
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Trade execution failed:', errorData.error);
        return;
    }

    const result = await response.json();
    console.log('Trade executed successfully:', result);
}

async function main() {
    try {
        console.log('Starting threshold verification...');

        // Check required environment variables
        const requiredEnvVars = [
            'OPERATOR_ID',
            'OPERATOR_KEY',
            'CONTRACT_ADDRESS_HEDERA'
        ];

        const missing = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        // Initialize Hedera client
        const client = Client.forTestnet();
        client.setOperator(
            AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!),
            PrivateKey.fromString(process.env.OPERATOR_KEY!)
        );

        const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
        const contractId = process.env.CONTRACT_ADDRESS_HEDERA!;

        console.log('Using addresses:');
        console.log('Contract (Hedera):', contractId);
        console.log('Operator:', operatorId.toString());

        // Set and verify threshold
        const isActive = await setAndVerifyThreshold(client, contractId, operatorId.toString());
        
        if (!isActive) {
            console.log('\nWARNING: Threshold not active or not found!');
            return;
        }
        
        console.log('\nSUCCESS: Threshold is active and properly stored');

        // Execute trade
        await executeTradeForUser(client, contractId, operatorId.toString());

    } catch (error: any) {
        console.error('Verification failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response?.data);
            console.error('Response status:', error.response?.status);
        }
        process.exit(1);
    }
}

main(); 