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

            // Create contract interface
            const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
            const contract = new ethers.Contract(
                contractAddress,
                ["function purchaseNFT(string memory buyer) external payable"],
                provider
            );

            // Create transaction
            const tx = await contract.purchaseNFT.populateTransaction(account);
            
            // Sign and execute transaction through wallet
            const result = await signAndExecuteTransaction({
                transaction: tx,
                accountId: account,
                value: ethers.parseEther("300") // 300 HBAR
            });

            if (result.success) {
                setStatus("NFT purchased successfully!");
            } else {
                setStatus("Purchase failed. Please try again.");
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