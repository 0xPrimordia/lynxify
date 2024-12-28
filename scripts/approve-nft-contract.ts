import {
    Client,
    ContractExecuteTransaction,
    ContractId,
    ContractFunctionParameters,
    AccountId,
    PrivateKey,
    Hbar
} from "@hashgraph/sdk";
import dotenv from "dotenv";

dotenv.config({ path: '.env.local' });

async function main() {
    if (!process.env.NEXT_PUBLIC_OPERATOR_ID || !process.env.OPERATOR_KEY || 
        !process.env.NEXT_PUBLIC_NFT_TOKEN_ID || !process.env.NEXT_PUBLIC_NFT_TOKEN_EVM_ID ||
        !process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_EVM_ADDRESS) {
        throw new Error("Environment variables must be present");
    }

    const client = Client.forTestnet();
    client.setOperator(
        AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID),
        PrivateKey.fromString(process.env.OPERATOR_KEY)
    );

    // Use the EVM addresses directly from env vars
    const nftTokenEvmAddress = process.env.NEXT_PUBLIC_NFT_TOKEN_EVM_ID;
    const contractEvmAddress = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_EVM_ADDRESS;

    console.log('Approving NFT contract...');
    console.log('NFT Token EVM:', nftTokenEvmAddress);
    console.log('Contract EVM:', contractEvmAddress);

    const approveTx = new ContractExecuteTransaction()
        .setContractId(ContractId.fromString(process.env.NEXT_PUBLIC_NFT_TOKEN_ID))
        .setGas(1000000)
        .setFunction(
            "setApprovalForAll",
            new ContractFunctionParameters()
                .addAddress(contractEvmAddress)
                .addBool(true)
        );

    const txResponse = await approveTx.execute(client);
    console.log('Transaction submitted:', txResponse.transactionId.toString());
    
    const receipt = await txResponse.getReceipt(client);
    console.log('Transaction status:', receipt.status.toString());
}

main(); 