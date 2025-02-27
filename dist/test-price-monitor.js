"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@hashgraph/sdk");
const axios_1 = __importDefault(require("axios"));
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
console.log('Starting test script...');
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const api = axios_1.default.create({
    baseURL: 'http://localhost:3000',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.API_KEY
    }
});
async function validateTestEnvironment() {
    try {
        console.log('Checking required environment variables...');
        const requiredEnvVars = [
            'NEXT_PUBLIC_OPERATOR_ID',
            'OPERATOR_KEY',
            'NEXT_PUBLIC_OPERATOR_EVM_ID',
            'TEST_TOKEN_A',
            'TEST_TOKEN_B',
            'TEST_POOL_ID',
            'API_KEY',
            'CONTRACT_ADDRESS',
            'CONTRACT_ADDRESS_HEDERA'
        ];
        const missing = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        console.log('All required environment variables present');
        const client = sdk_1.Client.forTestnet();
        client.setOperator(sdk_1.AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID), sdk_1.PrivateKey.fromStringED25519(process.env.OPERATOR_KEY));
        const operatorId = sdk_1.AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
        const operatorKey = sdk_1.PrivateKey.fromString(process.env.OPERATOR_KEY);
        const contractId = sdk_1.ContractId.fromString(process.env.CONTRACT_ADDRESS_HEDERA);
        const tokenA = sdk_1.TokenId.fromString(process.env.TEST_TOKEN_A);
        const tokenB = sdk_1.TokenId.fromString(process.env.TEST_TOKEN_B);
        const poolId = process.env.TEST_POOL_ID;
        console.log('Using addresses:');
        console.log('Contract (Hedera):', process.env.CONTRACT_ADDRESS_HEDERA);
        console.log('Contract (EVM):', process.env.CONTRACT_ADDRESS);
        console.log('Token A:', tokenA.toString());
        console.log('Token B:', tokenB.toString());
        console.log('Using Hedera IDs:');
        console.log('Operator:', operatorId.toString());
        console.log('Token:', tokenA.toString());
        console.log('Contract:', contractId.toString());
        const allowanceQuery = new sdk_1.ContractCallQuery()
            .setContractId(sdk_1.ContractId.fromString(tokenA.toString()))
            .setGas(100000)
            .setFunction("allowance", new sdk_1.ContractFunctionParameters()
            .addAddress(operatorId.toSolidityAddress())
            .addAddress(contractId.toSolidityAddress()));
        const allowanceResult = await allowanceQuery.execute(client);
        const currentAllowance = allowanceResult.getUint256(0);
        console.log('Current allowance:', currentAllowance.toString());
        const approvalAmount = "1000000000000000000000"; // 1000 tokens with 18 decimals
        if (BigInt(currentAllowance.toString()) < BigInt(approvalAmount)) {
            console.log('Approving tokens...');
            try {
                // Check token association first
                console.log('Checking token association...');
                const accountInfo = await new sdk_1.AccountInfoQuery()
                    .setAccountId(operatorId)
                    .execute(client);
                const tokenRelationship = accountInfo.tokenRelationships.get(tokenA);
                const isAssociated = tokenRelationship !== undefined;
                console.log('Token association status:', isAssociated);
                if (!isAssociated) {
                    console.log('Associating token...');
                    const associateTx = await new sdk_1.TokenAssociateTransaction()
                        .setAccountId(operatorId)
                        .setTokenIds([tokenA])
                        .execute(client);
                    const associateReceipt = await associateTx.getReceipt(client);
                    console.log('Association status:', associateReceipt.status.toString());
                }
                // Check balance
                const balanceQuery = new sdk_1.ContractCallQuery()
                    .setContractId(sdk_1.ContractId.fromString(tokenA.toString()))
                    .setGas(100000)
                    .setFunction("balanceOf", new sdk_1.ContractFunctionParameters()
                    .addAddress(operatorId.toSolidityAddress()));
                console.log('Checking balance...');
                const balanceResult = await balanceQuery.execute(client);
                const balance = balanceResult.getUint256(0);
                console.log('Token balance:', balance.toString());
                if (BigInt(balance.toString()) === BigInt(0)) {
                    throw new Error('No token balance available');
                }
                console.log('Proceeding with approval...');
                const testAmount = "1000000"; // 1 token with 6 decimals
                console.log('Debug approval parameters:');
                console.log('- Token contract:', tokenA.toString());
                console.log('- Owner:', process.env.OPERATOR_EVM_ID);
                console.log('- Spender:', process.env.CONTRACT_ADDRESS);
                console.log('- Amount:', testAmount);
                const approveTx = new sdk_1.ContractExecuteTransaction()
                    .setContractId(sdk_1.ContractId.fromString(tokenA.toString()))
                    .setGas(1000000)
                    .setMaxTransactionFee(new sdk_1.Hbar(2))
                    .setFunction("approve", new sdk_1.ContractFunctionParameters()
                    .addAddress(process.env.CONTRACT_ADDRESS)
                    .addUint256(testAmount));
                console.log('\nTransaction parameters:');
                console.log('- Function:', 'approve');
                console.log('- Gas:', 1000000);
                console.log('- Spender:', process.env.CONTRACT_ADDRESS);
                const txResponse = await approveTx.execute(client);
                console.log('Transaction submitted:', txResponse.transactionId.toString());
                const record = await txResponse.getRecord(client);
                if (record.contractFunctionResult) {
                    console.log('Contract call result:', {
                        error: record.contractFunctionResult.errorMessage,
                        logs: record.contractFunctionResult.logs,
                        gasUsed: record.contractFunctionResult.gasUsed?.toString()
                    });
                }
                const receipt = await txResponse.getReceipt(client);
                console.log('Transaction receipt status:', receipt.status.toString());
            }
            catch (error) {
                console.error('Transaction failed:', {
                    message: error.message,
                    details: error.details,
                    transactionId: error.transactionId?.toString()
                });
                throw error;
            }
        }
        // Authenticate using Hedera wallet signature
        const message = "Login to Price Monitor";
        const signature = await operatorKey.sign(Buffer.from(message));
        const signatureHex = Buffer.from(signature).toString('hex');
        console.log('\nAuthenticating with wallet...');
        const authResponse = await fetch('http://localhost:3000/api/auth/wallet-connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accountId: operatorId.toString(),
                signature: signatureHex,
                message
            })
        });
        if (!authResponse.ok) {
            const errorData = await authResponse.json();
            throw new Error(`Authentication failed: ${errorData.error}`);
        }
        const { session } = await authResponse.json();
        // Set thresholds with authenticated session
        const requestData = {
            stopLoss: 0.07,
            buyOrder: 0.09,
            stopLossCap: 100,
            buyOrderCap: 100,
            hederaAccountId: operatorId.toString(),
            tokenA: process.env.TEST_TOKEN_A,
            tokenB: process.env.TEST_TOKEN_B,
            fee: 3000,
            poolId: process.env.TEST_POOL_ID,
            userId: session.user.id
        };
        console.log('\nSetting thresholds...');
        const response = await fetch('http://localhost:3000/api/thresholds/setThresholds', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to set thresholds: ${errorData.details || errorData.error}`);
        }
        const responseData = await response.json();
        console.log('Threshold set response:', responseData);
        // Now we know id exists
        const testPrice = 0.06;
        const executeResponse = await api.post('/api/thresholds/executeOrder', {
            thresholdId: responseData.id,
            condition: 'sell',
            currentPrice: testPrice
        });
        console.log('Execute order response:', executeResponse.data);
        const { data: updatedThreshold, error: fetchError } = await supabase
            .from('Thresholds')
            .select('*')
            .eq('id', responseData.id)
            .single();
        if (fetchError) {
            throw new Error(`Failed to fetch updated threshold: ${fetchError.message}`);
        }
        console.log('Final threshold status:', updatedThreshold);
        await cleanup(responseData.id);
    }
    catch (error) {
        console.error('Test failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response?.data);
            console.error('Response status:', error.response?.status);
        }
        process.exit(1);
    }
}
async function cleanup(thresholdId) {
    try {
        const { error } = await supabase
            .from('Thresholds')
            .delete()
            .eq('id', thresholdId);
        if (error) {
            console.error('Cleanup error:', error);
        }
    }
    catch (error) {
        console.error('Cleanup failed:', error);
    }
}
validateTestEnvironment();
