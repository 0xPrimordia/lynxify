"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const sdk_1 = require("@hashgraph/sdk");
// Load environment variables from .env file
dotenv_1.default.config({ path: '.env.local' });
// Use your existing client setup
const NFT_SALE_CONTRACT = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS;
const OPERATOR_ID = process.env.NEXT_PUBLIC_OPERATOR_ID;
const OPERATOR_KEY = process.env.OPERATOR_KEY;
async function resetContract() {
    if (!OPERATOR_ID || !OPERATOR_KEY) {
        throw new Error("Environment variables OPERATOR_ID and OPERATOR_KEY must be present");
    }
    const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? sdk_1.Client.forMainnet() : sdk_1.Client.forTestnet();
    client.setOperator(sdk_1.AccountId.fromString(OPERATOR_ID), sdk_1.PrivateKey.fromString(OPERATOR_KEY));
    console.log('Resetting contract state...');
    const resetTx = await new sdk_1.ContractExecuteTransaction()
        .setContractId(sdk_1.ContractId.fromString(NFT_SALE_CONTRACT))
        .setGas(3000000)
        .setFunction("resetContract")
        .execute(client);
    const resetReceipt = await resetTx.getReceipt(client);
    // Verify the reset
    const soldSupplyQuery = new sdk_1.ContractCallQuery()
        .setContractId(sdk_1.ContractId.fromString(NFT_SALE_CONTRACT))
        .setGas(100000)
        .setFunction("soldSupply");
    const currentTokenIdQuery = new sdk_1.ContractCallQuery()
        .setContractId(sdk_1.ContractId.fromString(NFT_SALE_CONTRACT))
        .setGas(100000)
        .setFunction("currentTokenId");
    const soldSupply = await soldSupplyQuery.execute(client);
    const currentTokenId = await currentTokenIdQuery.execute(client);
    console.log('Contract state after reset:', {
        soldSupply: soldSupply.getUint256(0).toString(),
        currentTokenId: currentTokenId.getUint256(0).toString()
    });
}
resetContract().catch(console.error);
