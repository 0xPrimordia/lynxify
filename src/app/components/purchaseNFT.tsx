import { ContractExecuteTransaction, Hbar, ContractId, TransactionId } from "@hashgraph/sdk";
import { Button } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useState } from "react";
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';

function PurchaseNFT({ apiUrl, tokenId }: { apiUrl: string, tokenId: string }) {
    const { account, signAndExecuteTransaction } = useWalletContext();
    const [status, setStatus] = useState("");
    const contractAddress = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS;

    const handlePurchase = async () => {
        setStatus("Initiating purchase...");
        try {
            if (!account || !contractAddress) {
                throw new Error("Wallet not connected or contract not configured");
            }

            // Create a Hedera transaction
            const transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(contractAddress))
                .setGas(400000)
                .setPayableAmount(new Hbar(300))
                // Call the contract's purchaseNFT function with no parameters
                .setFunction("purchaseNFT")
                .setTransactionId(TransactionId.generate(account));

            // Convert to base64 string for wallet connect
            const base64Tx = transactionToBase64String(transaction);

            // Sign and execute the transaction
            const result = await signAndExecuteTransaction({
                transaction: base64Tx,
                accountId: account
            });

            if (result.success) {
                // Call your backend to initiate the NFT transfer
                const response = await fetch('/api/nft', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tokenId: tokenId,
                        serialNumber: '1', // You'll need to track this
                        buyer: account
                    })
                });

                if (!response.ok) {
                    throw new Error('NFT transfer failed');
                }

                setStatus("NFT purchased successfully!");
            } else {
                setStatus("Purchase failed. Please try again.");
            }
        } catch (error: any) {
            console.error("Purchase error:", error);
            setStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div>
            <h1>Purchase Lifetime Premium Access NFT</h1>
            <p>Price: 300 HBAR</p>
            <Button color="primary" onClick={handlePurchase}>Buy NFT</Button>
            <p>{status}</p>
        </div>
    );
}

export default PurchaseNFT;