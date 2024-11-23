import React, { useState } from "react";
import { useWalletContext } from "../hooks/useWallet";

function PurchaseNFT({ apiUrl, tokenId }: { apiUrl: string, tokenId: string }) {
    const { signAndExecuteTransaction } = useWalletContext();
    const [status, setStatus] = useState("");

    const handlePurchase = async () => {
        setStatus("Connecting wallet...");
        try {
            // Example: Wallet connection logic
            const buyer = "0.0.BuyerAccountId"; // Replace with actual buyer wallet address
            const treasuryId = "0.0.TreasuryAccountId"; // Replace with your treasury wallet ID

            // Step 1: Prepare the payment transaction
            const paymentParams = {
                transaction: {
                    nodeAccountId: ["0.0.3"], // Replace with the correct node
                    transactionFee: 1000000, // Transaction fee in tinybars
                    transfers: [
                        { accountId: buyer, amount: -300 * 1e8 }, // Debit buyer 300 HBAR
                        { accountId: treasuryId, amount: 300 * 1e8 }, // Credit treasury 300 HBAR
                    ],
                },
                accountId: buyer,
            };

            // Step 2: Sign and execute the transaction
            const result = await signAndExecuteTransaction(paymentParams);

            if (result.success) {
                setStatus("Payment successful. Transferring NFT...");

                // Step 3: Call the backend to transfer the NFT
                const response = await fetch(`${apiUrl}/transferNFT`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tokenId,
                        serialNumber: 1, // Replace with your serial number logic
                        buyer,
                    }),
                });

                const transferResult = await response.json();
                if (transferResult.success) {
                    setStatus(`NFT Transferred! Serial Number: ${transferResult.serialNumber}`);
                } else {
                    setStatus(`NFT Transfer failed: ${transferResult.error}`);
                }
            } else {
                setStatus("Payment failed. Please try again.");
            }
        } catch (error: any) {
            setStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div>
            <h1>Purchase Lifetime Premium Access NFT</h1>
            <p>Price: 300 HBAR</p>
            <button onClick={handlePurchase}>Buy NFT</button>
            <p>{status}</p>
        </div>
    );
}

export default PurchaseNFT;