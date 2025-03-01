"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@hashgraph/sdk");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
// Validate environment variables
if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || !process.env.CONTRACT_ADDRESS_HEDERA || !process.env.TEST_TOKEN_A || !process.env.HBAR_AMOUNT || !process.env.TEST_POOL_ID) {
    throw new Error("Environment variables OPERATOR_ID, OPERATOR_KEY, CONTRACT_ADDRESS_HEDERA, TEST_TOKEN_A, HBAR_AMOUNT, and TEST_POOL_ID must be present");
}
function decimalToPaddedHex(decimal, length) {
    let hexString = decimal.toString(16);
    while (hexString.length < length) {
        hexString = '0' + hexString;
    }
    return hexString;
}
function debugPath(path) {
    const pathHex = path.toString('hex');
    console.log('Path breakdown:', {
        whbar: pathHex.slice(0, 40),
        fee: pathHex.slice(40, 46),
        token: pathHex.slice(46)
    });
}
async function main() {
    // Initialize client
    const client = sdk_1.Client.forTestnet();
    client.setOperator(sdk_1.AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID), sdk_1.PrivateKey.fromString(process.env.OPERATOR_KEY));
    const operatorId = sdk_1.AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
    const contractId = process.env.CONTRACT_ADDRESS_HEDERA;
    const sauceToken = process.env.TEST_TOKEN_A;
    const WHBAR = '0.0.15058';
    const routerAddressHedera = process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS;
    console.log('Starting SaucerSwap HBAR->SAUCE trade test...');
    console.log('Using addresses:', {
        contract: contractId,
        operator: operatorId.toString(),
        operatorEVM: sdk_1.ContractId.fromString(operatorId.toString()).toSolidityAddress(),
        sauceToken: sauceToken,
        whbar: WHBAR,
        router: routerAddressHedera
    });
    try {
        // Set threshold using exact same format as working test
        const stopLossBasisPoints = 700;
        const buyOrderBasisPoints = 900;
        const tokenAddress = `0x${sdk_1.ContractId.fromString(sauceToken).toSolidityAddress()}`;
        const hbarAmount = sdk_1.Hbar.from(process.env.HBAR_AMOUNT, sdk_1.HbarUnit.Hbar);
        const amountInTinybar = hbarAmount.to(sdk_1.HbarUnit.Tinybar);
        console.log('Amount details:', {
            original: hbarAmount.toString(),
            tinybar: amountInTinybar.toString()
        });
        // Create path
        const whbarAddress = sdk_1.ContractId.fromString(WHBAR).toSolidityAddress().replace('0x', '');
        const sauceAddress = sdk_1.ContractId.fromString(sauceToken).toSolidityAddress().replace('0x', '');
        const fee = decimalToPaddedHex(3000, 6);
        const path = Buffer.concat([
            Buffer.from(whbarAddress, 'hex'),
            Buffer.from(fee, 'hex'),
            Buffer.from(sauceAddress, 'hex')
        ]);
        debugPath(path);
        // Check token association
        console.log('\nChecking token association...');
        const accountInfo = await new sdk_1.AccountInfoQuery()
            .setAccountId(operatorId)
            .execute(client);
        const tokenRelationship = accountInfo.tokenRelationships.get(sdk_1.TokenId.fromString(sauceToken));
        const isAssociated = tokenRelationship !== undefined;
        if (!isAssociated) {
            console.log('Associating token...');
            const associateTx = await new sdk_1.TokenAssociateTransaction()
                .setAccountId(operatorId)
                .setTokenIds([sdk_1.TokenId.fromString(sauceToken)])
                .execute(client);
            await associateTx.getReceipt(client);
            console.log('Token associated successfully');
        }
        else {
            console.log('Token already associated');
        }
        // Set thresholds in contract
        console.log('\nSetting thresholds...');
        const setThresholdTx = new sdk_1.ContractExecuteTransaction()
            .setContractId(sdk_1.ContractId.fromString(contractId))
            .setGas(1000000)
            .setFunction("setThresholds", new sdk_1.ContractFunctionParameters()
            .addUint256(stopLossBasisPoints)
            .addUint256(buyOrderBasisPoints)
            .addString(operatorId.toString())
            .addAddress(sdk_1.ContractId.fromString(sauceToken).toSolidityAddress())
            .addUint256(amountInTinybar.toString())
            .addUint256(amountInTinybar.toString()));
        const setThresholdResponse = await setThresholdTx.execute(client);
        const setThresholdReceipt = await setThresholdResponse.getReceipt(client);
        console.log('Set threshold transaction:', setThresholdResponse.transactionId.toString());
        console.log('Receipt status:', setThresholdReceipt.status.toString());
        // Verify threshold data
        console.log('\nVerifying threshold data...');
        const thresholdQuery = new sdk_1.ContractCallQuery()
            .setContractId(sdk_1.ContractId.fromString(contractId))
            .setGas(100000)
            .setFunction("getThreshold", new sdk_1.ContractFunctionParameters().addString(operatorId.toString()));
        const thresholdResult = await thresholdQuery.execute(client);
        console.log('Current threshold data:', {
            stopLossThreshold: thresholdResult.getUint256(0),
            buyOrderThreshold: thresholdResult.getUint256(1),
            hederaAccountId: thresholdResult.getString(2),
            tokenAddress: thresholdResult.getAddress(3),
            stopLossAmount: thresholdResult.getUint256(4),
            buyOrderAmount: thresholdResult.getUint256(5),
            isActive: thresholdResult.getBool(6)
        });
        // After threshold verification, before trade execution
        console.log('\nVerifying router setup...');
        console.log('Router address verification:', {
            expected: sdk_1.ContractId.fromString('0.0.1414040').toSolidityAddress(),
            contractConstant: '0x0000000000000000000000000000000000159398',
            match: '0x0000000000000000000000000000000000159398'.toLowerCase() ===
                sdk_1.ContractId.fromString('0.0.1414040').toSolidityAddress().toLowerCase()
        });
        // Calculate expected fee before trade
        const FEE_BASIS_POINTS = 8; // 0.08%
        const expectedFee = (Number(amountInTinybar.toString()) * FEE_BASIS_POINTS) / 10000;
        const expectedTradeAmount = Number(amountInTinybar.toString()) - expectedFee;
        console.log('Fee details:', {
            totalAmount: amountInTinybar.toString(),
            feeAmount: expectedFee.toString(),
            netTradeAmount: expectedTradeAmount.toString(),
            feePercentage: `${FEE_BASIS_POINTS / 100}%`
        });
        // Get initial balance of fee collector
        const contractQuery = new sdk_1.ContractCallQuery()
            .setContractId(sdk_1.ContractId.fromString(contractId))
            .setGas(100000)
            .setFunction("feeCollector");
        const feeCollectorEvmAddress = (await contractQuery.execute(client)).getAddress();
        // Use operator ID directly since it's already in Hedera format
        const initialBalance = await new sdk_1.AccountBalanceQuery()
            .setAccountId(operatorId) // Using operatorId which is already properly formatted
            .execute(client);
        // Execute trade through contract
        console.log('\nExecuting trade through contract...');
        console.log('Trade parameters:', {
            contractId: contractId,
            gas: 3000000,
            operatorId: operatorId.toString(),
            path: path.toString('hex'),
            hbarAmount: hbarAmount.toString(),
            tokenAssociated: isAssociated,
            orderType: 'stopLoss',
            expectedFee: expectedFee.toString(),
            expectedTradeAmount: expectedTradeAmount.toString()
        });
        const tradeTx = new sdk_1.ContractExecuteTransaction()
            .setContractId(sdk_1.ContractId.fromString(contractId))
            .setGas(3000000)
            .setFunction("executeTradeForUser", new sdk_1.ContractFunctionParameters()
            .addString(operatorId.toString())
            .addString("stopLoss")
            .addBytes(path))
            .setPayableAmount(hbarAmount);
        const tradeResponse = await tradeTx.execute(client);
        const tradeRecord = await tradeResponse.getRecord(client);
        // Verify fee collection using same operatorId
        const finalBalance = await new sdk_1.AccountBalanceQuery()
            .setAccountId(operatorId)
            .execute(client);
        const balanceDiff = finalBalance.hbars.toTinybars().subtract(initialBalance.hbars.toTinybars());
        console.log('Fee collection verification:', {
            expectedFee: expectedFee.toString(),
            actualFeePaid: balanceDiff.toString(),
            feeCollectorAddress: feeCollectorEvmAddress,
            feesMatch: balanceDiff.toString() === expectedFee.toString()
        });
        // Log trade execution details
        console.log('Trade execution details:', {
            result: tradeRecord.contractFunctionResult?.bytes,
            hbarTransfers: tradeRecord.transfers.map(t => ({
                account: t.accountId?.toString(),
                amount: t.amount.toString()
            })),
            events: tradeRecord.contractFunctionResult?.logs?.map(log => ({
                data: log.data,
                topics: log.topics
            }))
        });
    }
    catch (error) {
        console.log('Test failed:', error);
    }
    client.close();
}
main();
