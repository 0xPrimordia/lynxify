import { ContractExecuteTransaction, Hbar, ContractId, TransactionId, Client } from "@hashgraph/sdk";
import { Button } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useState } from "react";
import { transactionToBase64String } from '@hashgraph/hedera-wallet-connect';
import { ethers } from 'ethers';
import NFTSaleAbi from '../contracts/NFTSale.json';

// Helper function from SaucerSwap
function hexToUint8Array(hex: string): Uint8Array {
    if (hex.startsWith('0x')) {
        hex = hex.slice(2);
    }
    if (hex.length % 2 !== 0) {
        throw new Error('Hex string must have an even length');
    }
    const array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        array[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return array;
}

function PurchaseNFT({ apiUrl, tokenId }: { apiUrl: string, tokenId: string }) {
    const { account, signAndExecuteTransaction } = useWalletContext();
    const [status, setStatus] = useState("");
    const contractAddress = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS;
    
    // Create interface from full ABI
    const nftSaleInterface = new ethers.Interface(NFTSaleAbi);

    const handlePurchase = async () => {
        setStatus("Initiating purchase...");
        try {
            if (!account || !contractAddress) {
                throw new Error("Wallet not connected or contract not configured");
            }

            // Create client for freezing
            const client = Client.forTestnet();

            const encodedFunction = nftSaleInterface.encodeFunctionData("purchaseNFT", []);
            const functionCallBytes = hexToUint8Array(encodedFunction.slice(2));

            const transaction = await new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(contractAddress))
                .setGas(400000)
                .setPayableAmount(new Hbar(300))
                .setFunctionParameters(functionCallBytes)
                .freezeWith(client);

            const base64Tx = transactionToBase64String(transaction);

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