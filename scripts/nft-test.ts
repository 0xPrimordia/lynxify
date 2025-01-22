import { 
    Client, 
    ContractCallQuery,
    ContractId,
    AccountId,
    PrivateKey
} from "@hashgraph/sdk";

async function checkContract(contractId: string, operatorId: string, operatorKey: string, network: string = 'testnet') {
    const client = network === 'mainnet' ? Client.forMainnet() : Client.forTestnet();
    client.setOperator(
        AccountId.fromString(operatorId),
        PrivateKey.fromString(operatorKey)
    );

    const priceQuery = new ContractCallQuery()
        .setContractId(ContractId.fromString(contractId))
        .setGas(100000)
        .setFunction("price");

    const tokenAddressQuery = new ContractCallQuery()
        .setContractId(ContractId.fromString(contractId))
        .setGas(100000)
        .setFunction("tokenAddress");

    try {
        const price = await priceQuery.execute(client);
        const tokenAddress = await tokenAddressQuery.execute(client);
        
        console.log("Contract State:", {
            price: price.getUint256(0).toString(),
            tokenAddress: tokenAddress.getAddress(0)
        });
    } catch (error) {
        console.error("Error querying contract:", error);
    }
}

// Get command line arguments
const [,, contractId, operatorId, operatorKey, network = 'testnet'] = process.argv;

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