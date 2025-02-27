"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@hashgraph/sdk");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
async function main() {
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY ||
        !process.env.NEXT_PUBLIC_NFT_TOKEN_ID || !process.env.NEXT_PUBLIC_NFT_TOKEN_EVM_ID ||
        !process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_EVM_ADDRESS) {
        throw new Error("Environment variables must be present");
    }
    const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? sdk_1.Client.forMainnet() : sdk_1.Client.forTestnet();
    client.setOperator(sdk_1.AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID), sdk_1.PrivateKey.fromString(process.env.OPERATOR_KEY));
    // Use the EVM addresses directly from env vars
    const nftTokenEvmAddress = process.env.NEXT_PUBLIC_NFT_TOKEN_EVM_ID;
    const contractEvmAddress = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_EVM_ADDRESS;
    console.log('Approving NFT contract...');
    console.log('NFT Token EVM:', nftTokenEvmAddress);
    console.log('Contract EVM:', contractEvmAddress);
    const approveTx = new sdk_1.ContractExecuteTransaction()
        .setContractId(sdk_1.ContractId.fromString(process.env.NEXT_PUBLIC_NFT_TOKEN_ID))
        .setGas(1000000)
        .setFunction("setApprovalForAll", new sdk_1.ContractFunctionParameters()
        .addAddress(contractEvmAddress)
        .addBool(true));
    const txResponse = await approveTx.execute(client);
    console.log('Transaction submitted:', txResponse.transactionId.toString());
    const receipt = await txResponse.getReceipt(client);
    console.log('Transaction status:', receipt.status.toString());
}
main();
