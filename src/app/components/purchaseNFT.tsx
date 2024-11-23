import { ethers } from 'ethers';
import { Button } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useState } from "react";
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

            // Create transaction directly without contract interaction
            const tx = {
                to: contractAddress,
                value: ethers.parseEther("300"),
                data: "0x", // Empty data field for simple HBAR transfer
                gasLimit: "400000", // Explicit gas limit
            };

            // Sign and execute transaction through wallet
            const result = await signAndExecuteTransaction({
                transaction: tx,
                accountId: account
            });

            if (result.success) {
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