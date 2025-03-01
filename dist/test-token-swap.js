"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@hashgraph/sdk");
const ethers_1 = require("ethers");
const SwapRouter_json_1 = __importDefault(require("../src/app/lib/abis/SwapRouter.json"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
// Validate environment variables
if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY) {
    throw new Error("Environment variables OPERATOR_ID and OPERATOR_KEY must be present");
}
const swapRouterAbi = new ethers_1.ethers.Interface(SwapRouter_json_1.default);
async function checkTokenAssociation(client, accountId, tokenId) {
    const accountInfo = await new sdk_1.AccountInfoQuery()
        .setAccountId(accountId)
        .execute(client);
    const tokenRelationship = accountInfo.tokenRelationships.get(sdk_1.TokenId.fromString(tokenId));
    return tokenRelationship !== undefined;
}
async function main() {
    // Initialize client
    const client = sdk_1.Client.forTestnet();
    client.setOperator(sdk_1.AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID), sdk_1.PrivateKey.fromString(process.env.OPERATOR_KEY));
    const operatorId = sdk_1.AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID);
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
        const balancesBefore = await new sdk_1.AccountBalanceQuery()
            .setAccountId(operatorId)
            .execute(client);
        console.log('Balances before swap:', balancesBefore.tokens?.toString());
        // Construct path
        const path = Buffer.concat([
            Buffer.from(sdk_1.ContractId.fromString(SAUCE_TOKEN).toSolidityAddress().replace('0x', ''), 'hex'),
            Buffer.from(FEE.toString(16).padStart(6, '0'), 'hex'),
            Buffer.from(sdk_1.ContractId.fromString(CLXY_TOKEN).toSolidityAddress().replace('0x', ''), 'hex')
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
        const swapTx = await new sdk_1.ContractExecuteTransaction()
            .setContractId(sdk_1.ContractId.fromString(ROUTER_ADDRESS))
            .setGas(3000000)
            .setFunctionParameters(Buffer.from(swapEncoded.slice(2), 'hex'))
            .setTransactionId(sdk_1.TransactionId.generate(operatorId.toString()))
            .execute(client);
        const record = await swapTx.getRecord(client);
        console.log('Swap transaction result:', {
            status: record.receipt.status.toString(),
            gasUsed: record.contractFunctionResult?.gasUsed?.toString(),
            error: record.contractFunctionResult?.errorMessage,
        });
        // Check final balances
        const balancesAfter = await new sdk_1.AccountBalanceQuery()
            .setAccountId(operatorId)
            .execute(client);
        console.log('Balances after swap:', balancesAfter.tokens?.toString());
    }
    catch (error) {
        console.error('Error executing swap:', error);
    }
}
main()
    .then(() => process.exit(0))
    .catch(error => {
    console.error(error);
    process.exit(1);
});
