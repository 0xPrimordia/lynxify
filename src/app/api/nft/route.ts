import { NextRequest, NextResponse } from 'next/server';
import { 
    Client, 
    TransferTransaction, 
    PrivateKey, 
    ContractCallQuery, 
    ContractId,
    TokenId
} from "@hashgraph/sdk";

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { tokenId, buyer, transactionId } = body;
    const treasuryId = process.env.OPERATOR_ID;
    const contractAddress = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS;

    if (!tokenId || !buyer || !transactionId || !contractAddress) {
        console.error('Missing required fields:', { tokenId, buyer, transactionId, contractAddress });
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        const client = Client.forTestnet();
        client.setOperator(process.env.OPERATOR_ID as string, process.env.OPERATOR_KEY as string);

        // Get the serial number from contract
        const tokenIdQuery = new ContractCallQuery()
            .setContractId(ContractId.fromString(contractAddress))
            .setGas(100000)
            .setFunction("currentTokenId");

        const currentTokenId = (await tokenIdQuery.execute(client)).getUint256(0);
        const serialNumber = (BigInt(currentTokenId.toString()) - 1n).toString();

        console.log('NFT Transfer Details:', {
            tokenId,
            serialNumber,
            buyer,
            treasuryId,
            transactionId
        });

        const transferTx = new TransferTransaction()
            .addNftTransfer(tokenId, serialNumber, process.env.OPERATOR_ID as string, buyer)
            .freezeWith(client);

        console.log('Transaction created, signing...');
        const signedTx = await transferTx.sign(PrivateKey.fromString(process.env.OPERATOR_KEY as string));
        
        console.log('Executing transfer...');
        const txResponse = await signedTx.execute(client);
        
        console.log('Waiting for receipt...');
        const receipt = await txResponse.getReceipt(client);

        console.log('Transfer complete:', {
            status: receipt.status.toString(),
            transactionId: txResponse.transactionId.toString()
        });

        if (receipt.status.toString() !== "SUCCESS") {
            throw new Error("Transfer failed");
        }

        return NextResponse.json({ 
            success: true, 
            serialNumber, 
            buyer,
            transactionId: txResponse.transactionId.toString()
        });
    } catch (error: any) {
        console.error("Error transferring NFT:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
