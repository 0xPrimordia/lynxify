import { ContractExecuteTransaction, Hbar, ContractId, TransactionId, Client, HbarUnit, TokenAssociateTransaction, TokenId, AccountId, AccountBalanceQuery, ContractFunctionParameters, ContractCallQuery, TransactionReceiptQuery } from "@hashgraph/sdk";
import { Button } from "@nextui-org/react";
import { useWalletContext } from "../hooks/useWallet";
import { useState, useEffect } from "react";
import { 
    transactionToBase64String,
    SignAndExecuteTransactionParams,
    SignAndExecuteTransactionResult
} from '@hashgraph/hedera-wallet-connect';
import { ethers } from 'ethers';
import NFTSaleAbi from '../contracts/NFTSale.json';
import { checkTokenAssociation } from '../lib/utils/tokens';

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

function accountIdToEvmAddress(accountId: string): string {
    // Parse the account ID parts
    const [shard, realm, num] = accountId.split('.').map(part => BigInt(part));
    
    // Convert to hex and pad to 40 characters (20 bytes)
    // We only use the num part as that's what Hedera does
    const hexString = num.toString(16).padStart(40, '0');
    
    console.log('Address conversion:', {
        accountId,
        parts: { shard, realm, num },
        hexString,
        finalAddress: '0x' + hexString
    });
    
    return '0x' + hexString;
}

async function verifyTokenAssociation(accountId: string, tokenId: string, client: Client) {
    try {
        const query = new AccountBalanceQuery()
            .setAccountId(AccountId.fromString(accountId));
        
        const accountBalance = await query.execute(client);
        const tokens = accountBalance?.tokens?._map;
        
        console.log('Token association verification:', {
            accountId,
            tokenId,
            hasToken: tokens?.has(tokenId),
            allTokens: Array.from(tokens?.keys() || [])
        });
        
        return tokens?.has(tokenId) || false;
    } catch (error) {
        console.error('Error verifying token association:', error);
        return false;
    }
}

// Define the type for the sign and execute function
type SignAndExecuteTransactionFunction = (
    params: SignAndExecuteTransactionParams
) => Promise<SignAndExecuteTransactionResult>;

async function associateToken(
    tokenId: string, 
    accountId: string, 
    client: Client,
    signAndExecuteTransaction: SignAndExecuteTransactionFunction
) {
    try {
        // Create token associate transaction
        const transaction = await new TokenAssociateTransaction()
            .setAccountId(AccountId.fromString(accountId))
            .setTokenIds([TokenId.fromString(tokenId)])
            .setTransactionId(TransactionId.generate(accountId))
            .freezeWith(client);

        const base64Tx = transactionToBase64String(transaction);
        
        // Sign and execute the association using wallet context
        const response = await signAndExecuteTransaction({
            transactionList: base64Tx,
            signerAccountId: accountId
        });

        // Just return the response - we'll verify the association afterward
        return response;
    } catch (error) {
        console.error('Error associating token:', error);
        throw error;
    }
}

function PurchaseNFT({ 
    apiUrl, 
    tokenId, 
    client
}: { 
    apiUrl: string, 
    tokenId: string, 
    client: Client
}) {
    const { account, signAndExecuteTransaction, dAppConnector } = useWalletContext();
    const [status, setStatus] = useState("");
    const contractAddress = process.env.NEXT_PUBLIC_NFT_SALE_CONTRACT_ADDRESS;
    const nftTokenId = process.env.NEXT_PUBLIC_NFT_TOKEN_ID;
    
    const nftSaleInterface = new ethers.Interface(NFTSaleAbi.abi);

    const [hasPurchased, setHasPurchased] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    // Add useEffect to check purchase status on load
    useEffect(() => {
        async function checkPurchaseStatus() {
            if (account && contractAddress) {
                console.log('Checking purchase status for:', account);
                const purchased = await checkHasPurchased(contractAddress, account);
                console.log('Purchase status result:', purchased);
                setHasPurchased(purchased);
            }
            setIsChecking(false);
        }
        
        checkPurchaseStatus();
    }, [account, contractAddress]);

    const handlePurchase = async () => {
        setStatus("Checking purchase status...");
        let accountBalance: any;
        try {
            if (!account || !contractAddress || !nftTokenId || !dAppConnector) {
                throw new Error("Wallet not connected or contract not configured");
            }

            // Check if already purchased
            const alreadyPurchased = await checkHasPurchased(contractAddress, account);
            if (alreadyPurchased) {
                setStatus("You have already purchased an NFT");
                return;
            }

            // Check token association first
            setStatus("Checking token association...");
            const isAssociated = await verifyTokenAssociation(account, nftTokenId, client);
            if (!isAssociated) {
                setStatus("Associating token...");
                try {
                    await associateToken(nftTokenId, account, client, signAndExecuteTransaction);
                    
                    // Wait a moment for the association to be processed
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Verify association was successful
                    const verifyAssociation = await verifyTokenAssociation(account, nftTokenId, client);
                    if (!verifyAssociation) {
                        throw new Error("Token association failed. Please try again.");
                    }
                } catch (error: any) {
                    console.error("Token association error:", error);
                    throw new Error(`Token association failed: ${error.message}`);
                }
            }

            // Continue with balance check and purchase
            setStatus("Checking balance...");
            let retries = 3;
            
            while (retries > 0) {
                try {
                    accountBalance = await new AccountBalanceQuery()
                        .setAccountId(AccountId.fromString(account))
                        .execute(client);
                    break;
                } catch (error) {
                    retries--;
                    if (retries === 0) throw error;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            const requiredBalance = new Hbar(51); // 50 HBAR + 1 for fees
            
            // Convert to numbers for simple comparison
            const balanceInHbar = Number(accountBalance.hbars.toString().replace(' ℏ', ''));
            const requiredInHbar = Number(requiredBalance.toString().replace(' ℏ', ''));
            
            console.log("Balance check:", {
                accountBalance: balanceInHbar,
                required: requiredInHbar
            });

            if (balanceInHbar <= requiredInHbar) {
                throw new Error(`Insufficient balance. You need at least ${requiredInHbar} HBAR but have ${balanceInHbar} HBAR`);
            }

            // Execute purchase...
            setStatus("Processing purchase...");
            const transaction = new ContractExecuteTransaction()
                .setContractId(ContractId.fromString(contractAddress))
                .setGas(3000000)
                .setPayableAmount(new Hbar(50))
                .setFunction("purchaseNFT")
                .setTransactionId(TransactionId.generate(account))
                .setMaxTransactionFee(new Hbar(15))
                .freezeWith(client);

            const base64Tx = transactionToBase64String(transaction);
            const response = await signAndExecuteTransaction({
                transactionList: base64Tx,
                signerAccountId: account
            });

            if (response.error) {
                throw new Error(`Transaction failed: ${response.error}`);
            }

            // Check transaction status
            const txId = TransactionId.fromString(response.transactionId);
            const receipt = await new TransactionReceiptQuery()
                .setTransactionId(txId)
                .execute(client);

            if (receipt.status.toString() === "SUCCESS") {
                setStatus("Purchase recorded, transferring NFT...");
                
                // Call API to transfer NFT - let backend determine the serial number
                const transferResponse = await fetch('/api/nft', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tokenId: nftTokenId,
                        buyer: account,
                        transactionId: response.transactionId
                    })
                });

                if (!transferResponse.ok) {
                    const error = await transferResponse.json();
                    console.error("NFT transfer failed:", error);
                    throw new Error(`NFT transfer failed: ${error.error}`);
                }

                const result = await transferResponse.json();
                console.log("NFT Transfer result:", result);
                setStatus(`NFT transferred successfully!`);
            } else {
                throw new Error(`Transaction failed with status: ${receipt.status.toString()}`);
            }

        } catch (error: any) {
            console.error("Purchase failed:", error);
            const errorMessage = error?.message || "Purchase failed. Please try again.";
            
            // Safer error message checking
            if (typeof errorMessage === 'string') {
                if (errorMessage.includes("INSUFFICIENT_PAYER_BALANCE")) {
                    setStatus("Insufficient balance. Please ensure you have at least 65 HBAR (50 HBAR + fees)");
                } else if (errorMessage.includes("CONTRACT_REVERT_EXECUTED")) {
                    setStatus("Purchase failed. You may have already purchased or the sale might be sold out.");
                } else {
                    setStatus(errorMessage);
                }
            } else {
                setStatus("Purchase failed. Please try again.");
            }
        }
    };

    // Add this function near getCurrentTokenId
    async function checkHasPurchased(contractAddress: string, account: string): Promise<boolean> {
        try {
            // Get contract's transaction history
            const stateUrl = `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/contracts/${contractAddress}/results?limit=100&order=desc`;
            const response = await fetch(stateUrl);
            const data = await response.json();
            
            // Find successful purchase transactions
            const myAddress = accountIdToEvmAddress(account);
            const hasPurchased = data.results?.some((tx: any) => 
                tx.from === myAddress && 
                !tx.error_message && 
                tx.function_parameters === "0x613b4d32"  // purchaseNFT function signature
            );
            
            console.log('Purchase check:', {
                account,
                myAddress,
                hasPurchased,
                transactions: data.results?.filter((tx: any) => 
                    tx.function_parameters === "0x613b4d32"
                )
            });
            
            return hasPurchased;
        } catch (error) {
            console.error('Error checking purchase status:', error);
            return false;
        }
    }

    return (
        <div className="flex flex-col items-center gap-6 py-4">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">
                    Lifetime Premium Access NFT
                </h2>
                <p className="text-gray-600">
                    Get unlimited access to all premium features
                </p>
            </div>
            
            <div className="bg-gray-800 p-4 rounded-lg w-full">
                <div className="flex justify-center items-center gap-2">
                    <span className="text-white text-xl font-semibold">50</span>
                    <img 
                        style={{width:"24px", display:"inline-block"}} 
                        src="/images/hedera-hbar-logo.png" 
                        alt="HBAR"
                    />
                </div>
            </div>

            {!account && (
                <p className="text-center text-gray-600">
                    Please connect your wallet from the navigation bar above to purchase the NFT.
                </p>
            )}

            {account && isChecking && (
                <p className="text-center text-gray-600">
                    Checking purchase status...
                </p>
            )}

            {account && !isChecking && hasPurchased && (
                <p className="text-center text-green-500">
                    You have already purchased an NFT!
                </p>
            )}

            {account && !isChecking && !hasPurchased && (
                <Button 
                    color="primary"
                    className="w-full"
                    onClick={handlePurchase}
                    style={{
                        backgroundColor: "#0159E0"
                    }}
                >
                    Purchase NFT
                </Button>
            )}
            
            {status && (
                <p className={`text-center ${
                    status.includes("Error") ? "text-red-500" : 
                    status.includes("success") ? "text-green-500" : 
                    "text-gray-600"
                }`}>
                    {status}
                </p>
            )}
        </div>
    );
}

export default PurchaseNFT;