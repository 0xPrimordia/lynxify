import { Client, TransferTransaction, PrivateKey } from "@hashgraph/sdk";

async function validatePayment(buyer: string, amount: number, treasuryId: string) {
    const response = await fetch(
        `https://testnet.mirrornode.hedera.com/api/v1/transactions?account.id=${treasuryId}`
    );
    const data = await response.json();

    // Check if the buyer sent the required amount
    const transaction = data.transactions.find((tx: any) =>
        tx.transfers.some(
            (transfer: any) =>
                transfer.account === buyer && transfer.amount === amount * 1e8 // HBAR in tinybars
        )
    );

    return transaction !== undefined;
}

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { tokenId, serialNumber, buyer } = req.body;
    const treasuryId = process.env.OPERATOR_ID; // Treasury account ID
    const amount = 300; // HBAR

    if (!tokenId || !serialNumber || !buyer) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // Step 1: Validate Payment
        const paymentValid = await validatePayment(buyer, amount, treasuryId as string);
        if (!paymentValid) {
            return res.status(400).json({ error: "Payment validation failed" });
        }

        // Step 2: Transfer the NFT
        const client = Client.forTestnet();
        client.setOperator(process.env.OPERATOR_ID as string, process.env.OPERATOR_KEY as string);

        const transferTx = new TransferTransaction()
            .addNftTransfer(tokenId, serialNumber, process.env.OPERATOR_ID as string, buyer)
            .freezeWith(client);

        const signedTx = await transferTx.sign(PrivateKey.fromString(process.env.OPERATOR_KEY as string));
        const txResponse = await signedTx.execute(client);
        const receipt = await txResponse.getReceipt(client);

        if (receipt.status.toString() !== "SUCCESS") {
            throw new Error("Transfer failed");
        }

        res.status(200).json({ success: true, serialNumber, buyer });
    } catch (error: any) {
        console.error("Error transferring NFT:", error);
        res.status(500).json({ error: error.message });
    }
}
