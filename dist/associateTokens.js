"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@hashgraph/sdk");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
async function main() {
    const client = sdk_1.Client.forTestnet();
    client.setOperator(sdk_1.AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID), sdk_1.PrivateKey.fromString(process.env.OPERATOR_KEY));
    const contractId = process.env.MINTER_CONTRACT_ID;
    const sauceTokenId = process.env.SAUCE_TOKEN_ID;
    const clxyTokenId = process.env.CLXY_TOKEN_ID;
    console.log("Associating tokens with contract:", {
        contract: contractId,
        tokens: [sauceTokenId, clxyTokenId]
    });
    const associateTx = await new sdk_1.TokenAssociateTransaction()
        .setAccountId(sdk_1.ContractId.fromString(contractId).toSolidityAddress())
        .setTokenIds([sauceTokenId, clxyTokenId])
        .execute(client);
    const receipt = await associateTx.getReceipt(client);
    console.log("Token association status:", receipt.status.toString());
}
main().catch(console.error);
