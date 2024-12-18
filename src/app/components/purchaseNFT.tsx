import { ContractExecuteTransaction, Hbar, ContractId, TransactionId, Client } from "@hashgraph/sdk";
import { Button } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useState } from "react";
import { 
    transactionToBase64String,
    SignAndExecuteTransactionParams,
    SignAndExecuteTransactionResult
} from '@hashgraph/hedera-wallet-connect';
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

function PurchaseNFT({ apiUrl, tokenId, client }: { apiUrl: string, tokenId: string, client: Client }) {
    const { account, signAndExecuteTransaction, dAppConnector } = useWalletContext();
    const [status, setStatus] = useState("");
    const contractAddress = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS;
    
    const nftSaleInterface = new ethers.Interface(NFTSaleAbi);

    const handlePurchase = async () => {
        setStatus("Initiating purchase...");
        try {
            if (!account || !contractAddress || !dAppConnector) {
                throw new Error("Wallet not connected, contract not configured, or DAppConnector not initialized");
            }

            const encodedFunction = nftSaleInterface.encodeFunctionData("purchaseNFT", []);
            const functionCallBytes = hexToUint8Array(encodedFunction.slice(2));

            const transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(contractAddress))
                .setGas(400000)
                .setPayableAmount(new Hbar(300))
                .setFunctionParameters(functionCallBytes)
                .setTransactionId(TransactionId.generate(account));

            const base64Tx = transactionToBase64String(transaction);

            const params: SignAndExecuteTransactionParams = {
                transactionList: base64Tx,
                signerAccountId: 'hedera:testnet:' + account
            };

            const result: SignAndExecuteTransactionResult = await dAppConnector.signAndExecuteTransaction(params);

            if (result) {
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