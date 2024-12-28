import dotenv from 'dotenv';
import { 
    Client, 
    ContractExecuteTransaction, 
    ContractId,
    ContractCallQuery,
    AccountId,
    PrivateKey
} from "@hashgraph/sdk";

// Load environment variables from .env file
dotenv.config({ path: '.env.local' });

// Use your existing client setup
const NFT_SALE_CONTRACT = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS;
const OPERATOR_ID = process.env.NEXT_PUBLIC_OPERATOR_ID;
const OPERATOR_KEY = process.env.OPERATOR_KEY;

async function resetContract() {
    if (!OPERATOR_ID || !OPERATOR_KEY) {
        throw new Error("Environment variables OPERATOR_ID and OPERATOR_KEY must be present");
    }

    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(OPERATOR_ID),
        PrivateKey.fromString(OPERATOR_KEY)
    );

    console.log('Resetting contract state...');
    
    const resetTx = await new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(NFT_SALE_CONTRACT!))
        .setGas(3000000)
        .setFunction("resetContract")
        .execute(client);

    const resetReceipt = await resetTx.getReceipt(client);
    
    // Verify the reset
    const soldSupplyQuery = new ContractCallQuery()
        .setContractId(ContractId.fromString(NFT_SALE_CONTRACT!))
        .setGas(100000)
        .setFunction("soldSupply");

    const currentTokenIdQuery = new ContractCallQuery()
        .setContractId(ContractId.fromString(NFT_SALE_CONTRACT!))
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
