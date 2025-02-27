"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_1 = require("@hashgraph/sdk");
async function checkContract(contractId, operatorId, operatorKey, network = 'testnet') {
    const client = network === 'mainnet' ? sdk_1.Client.forMainnet() : sdk_1.Client.forTestnet();
    client.setOperator(sdk_1.AccountId.fromString(operatorId), sdk_1.PrivateKey.fromString(operatorKey));
    const priceQuery = new sdk_1.ContractCallQuery()
        .setContractId(sdk_1.ContractId.fromString(contractId))
        .setGas(100000)
        .setFunction("price");
    const tokenAddressQuery = new sdk_1.ContractCallQuery()
        .setContractId(sdk_1.ContractId.fromString(contractId))
        .setGas(100000)
        .setFunction("tokenAddress");
    try {
        const price = await priceQuery.execute(client);
        const tokenAddress = await tokenAddressQuery.execute(client);
        console.log("Contract State:", {
            price: price.getUint256(0).toString(),
            tokenAddress: tokenAddress.getAddress(0)
        });
    }
    catch (error) {
        console.error("Error querying contract:", error);
    }
}
// Get command line arguments
const [, , contractId, operatorId, operatorKey, network = 'testnet'] = process.argv;
if (!contractId || !operatorId || !operatorKey) {
    console.error("Usage: npx ts-node scripts/nft-test.ts <contractId> <operatorId> <operatorKey> [network]");
    process.exit(1);
}
checkContract(contractId, operatorId, operatorKey, network)
    .then(() => process.exit(0))
    .catch((error) => {
    console.error(error);
    process.exit(1);
});
