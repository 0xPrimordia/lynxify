import { ContractExecuteTransaction, Hbar, ContractId, TransactionId } from "@hashgraph/sdk";
import { Button } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useState } from "react";
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { ethers } from 'ethers';

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

            // Create ABI interface for the purchaseNFT function
            const functionAbi = ["function purchaseNFT()"];
            const iface = new ethers.Interface(functionAbi);
            
            // Encode the function call
            const encodedFunction = iface.encodeFunctionData("purchaseNFT", []);
            const functionCallBytes = Buffer.from(encodedFunction.slice(2), 'hex');

            // Create a Hedera transaction
            const transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(contractAddress))
                .setGas(400000)
                .setPayableAmount(new Hbar(300))
                .setFunctionParameters(functionCallBytes)
                .setTransactionId(TransactionId.generate(account));

            // Convert to base64 string for wallet connect
            const base64Tx = transactionToBase64String(transaction);

            // Sign and execute the transaction
            const result = await signAndExecuteTransaction({
                transaction: base64Tx,
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