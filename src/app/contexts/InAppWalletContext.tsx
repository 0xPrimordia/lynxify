"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PrivateKey, Transaction, TransactionId, Client, AccountCreateTransaction, Hbar, TransactionReceipt } from "@hashgraph/sdk";
import { supabase } from '@/utils/supabase';
import { base64StringToTransaction } from "@hashgraph/hedera-wallet-connect";
import { decrypt } from '@/lib/utils/encryption';
import { attemptRecovery, retrievePrivateKey } from '@/lib/utils/keyStorage';

export interface InAppWalletContextType {
  inAppAccount: string | null;
  isInAppWallet: boolean;
  client: Client | null;
  error: string | null;
  isRecoveryInProgress: boolean;
  loadWallet: (password: string) => Promise<PrivateKey | null>;
  signTransaction: (transaction: string, password: string) => Promise<any>;
  setInAppAccount: (accountId: string) => void;
  recoverKey: (userId: string) => Promise<void>;
  verifyMetadataSync: (currentMetadata: any, storedMetadata: any) => Promise<boolean>;
}

export const InAppWalletContext = createContext<InAppWalletContextType | undefined>(undefined);

interface InAppWalletState {
    isInAppWallet: boolean;
    inAppAccount: string | null;
    inAppPrivateKey: PrivateKey | null;
    error: string | null;
    isRecoveryInProgress: boolean;
}

export const InAppWalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [walletState, setWalletState] = useState<InAppWalletState>({
        isInAppWallet: false,
        inAppAccount: null,
        inAppPrivateKey: null,
        error: null,
        isRecoveryInProgress: false
    });
    
    const operationLock = useRef<boolean>(false);
    const recoveryLock = useRef<boolean>(false);
    const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' 
        ? Client.forMainnet() 
        : Client.forTestnet();

    useEffect(() => {
        const checkInAppWallet = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.id) return;

                const metadata = session.user.user_metadata;
                if (metadata?.isInAppWallet && metadata?.hederaAccountId) {
                    setWalletState(prev => ({
                        ...prev,
                        isInAppWallet: true,
                        inAppAccount: metadata.hederaAccountId
                    }));
                }
            } catch (error) {
                console.error('Error checking wallet status:', error);
                setWalletState(prev => ({ ...prev, error: 'Failed to check wallet status' }));
            }
        };

        checkInAppWallet();
    }, []);

    // Define consistent error handling
    const handleError = (error: Error | string) => {
        const actualError = error instanceof Error ? error : new Error(error);
        console.error(actualError.message, actualError);
        setWalletState(prev => ({ ...prev, error: actualError.message }));
        throw actualError;
    };

    const loadWallet = async (password: string): Promise<PrivateKey | null> => {
        if (operationLock.current || walletState.isRecoveryInProgress) {
            handleError(new Error('Operation in progress'));
        }
        
        operationLock.current = true;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) throw new Error("No authenticated session");

            // Verify metadata matches before proceeding
            const metadata = session.user.user_metadata;
            if (!metadata?.isInAppWallet || !metadata?.hederaAccountId) {
                throw new Error("No in-app wallet configured");
            }

            const decryptedKey = await retrievePrivateKey(session.user.id, password);
            if (!decryptedKey) {
                throw new Error("Failed to retrieve private key");
            }

            const privateKey = PrivateKey.fromString(decryptedKey);
            setWalletState(prev => ({
                ...prev,
                inAppPrivateKey: privateKey,
                error: null
            }));

            return privateKey;
        } catch (error: any) {
            handleError(error);
            return null;
        } finally {
            operationLock.current = false;
        }
    };

    const signTransaction = async (transaction: string, password: string) => {
        console.log("Starting signTransaction with tx length:", transaction.length);
        try {
            console.log("Loading wallet...");
            const privateKey = await loadWallet(password);
            if (!privateKey) throw new Error("Failed to load private key");
            
            console.log("Converting transaction...");
            const tx = base64StringToTransaction(transaction);
            
            console.log("Signing transaction...");
            const signedTx = await tx.sign(privateKey);
            console.log("Executing transaction...");
            const response = await signedTx.execute(client);
            
            // Add timeout and detailed error handling for receipt
            const receiptPromise = response.getReceipt(client);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Transaction receipt timeout")), 30000)
            );
            
            console.log("Getting receipt...");
            try {
                const receipt = await Promise.race([receiptPromise, timeoutPromise]) as TransactionReceipt;
                console.log("Receipt details:", {
                    status: receipt.status.toString(),
                    contractId: receipt.contractId?.toString(),
                    exchangeRate: receipt.exchangeRate,
                    accountId: receipt.accountId?.toString()
                });
                
                if (receipt.status._code !== 22) { // SUCCESS
                    throw new Error(`Transaction failed with status: ${receipt.status.toString()}`);
                }
            } catch (receiptError) {
                console.error("Receipt error details:", {
                    error: receiptError,
                    transactionId: response.transactionId.toString()
                });
                throw receiptError;
            }
            
            console.log("Transaction complete, clearing key...");
            setWalletState(prev => ({
                ...prev,
                inAppPrivateKey: null
            }));
            
            return {
                status: 'SUCCESS',
                error: null,
                transactionId: response.transactionId.toString()
            };
        } catch (error) {
            console.error("Transaction signing error:", {
                error,
                message: error instanceof Error ? error.message : 'Unknown error',
                type: (error as any)?.constructor?.name || 'Unknown type'
            });
            
            setWalletState(prev => ({
                ...prev,
                inAppPrivateKey: null
            }));
            
            return {
                status: 'ERROR',
                error: error instanceof Error ? error.message : 'Transaction signing failed',
                transactionId: null
            };
        }
    };

    const verifyMetadataSync = async (currentMetadata: any, storedMetadata: any) => {
        if (!currentMetadata?.hederaAccountId || !storedMetadata?.hederaAccountId) {
            handleError(new Error('Invalid metadata'));
        }
        if (currentMetadata.hederaAccountId !== storedMetadata.hederaAccountId) {
            handleError(new Error('Account metadata mismatch'));
        }
        return true;
    };

    const recoverKey = async (userId: string): Promise<void> => {
        if (recoveryLock.current) {
            handleError(new Error('Recovery already in progress'));
        }
        
        recoveryLock.current = true;
        setWalletState(prev => ({ ...prev, isRecoveryInProgress: true }));
        
        try {
            await attemptRecovery(userId);
        } catch (error: any) {
            handleError(error);
        } finally {
            recoveryLock.current = false;
            setWalletState(prev => ({ ...prev, isRecoveryInProgress: false }));
        }
    };

    return (
        <InAppWalletContext.Provider value={{
            inAppAccount: walletState.inAppAccount,
            isInAppWallet: walletState.isInAppWallet,
            client,
            error: walletState.error,
            isRecoveryInProgress: walletState.isRecoveryInProgress,
            loadWallet,
            signTransaction,
            setInAppAccount: (accountId: string) => setWalletState(prev => ({ ...prev, inAppAccount: accountId })),
            recoverKey,
            verifyMetadataSync
        }}>
            {children}
        </InAppWalletContext.Provider>
    );
};

export const useInAppWallet = () => {
    const context = useContext(InAppWalletContext);
    if (context === undefined) {
        throw new Error('useInAppWallet must be used within an InAppWalletProvider');
    }
    return context;
}; 