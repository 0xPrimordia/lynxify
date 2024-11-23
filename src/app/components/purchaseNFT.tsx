import { ethers } from 'ethers';
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

            // Create contract interface with proper ABI
            const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
            const abi = ["function purchaseNFT(string) external payable"];
            const contract = new ethers.Contract(contractAddress, abi, provider);

            // Create transaction
            const tx = await contract.purchaseNFT.populateTransaction(account);
            tx.to = contractAddress;  // Ensure the 'to' address is set
            tx.value = ethers.parseEther("300");  // Set the value here

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
            <button onClick={handlePurchase}>Buy NFT</button>
            <p>{status}</p>
        </div>
    );
}

export default PurchaseNFT;