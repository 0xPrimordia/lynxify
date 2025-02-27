"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PrivateKey, Transaction, TransactionId, Client, AccountCreateTransaction, Hbar, TransactionReceipt, TransferTransaction } from "@hashgraph/sdk";
import { supabase } from '@/utils/supabase';
import { base64StringToTransaction } from "@hashgraph/hedera-wallet-connect";
import { decrypt } from '@/lib/utils/encryption';
import { attemptRecovery, retrievePrivateKey } from '@/lib/utils/keyStorage';
import { PasswordModalContext } from '@/app/types';

export interface WalletOperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export interface InAppWalletContextType {
    inAppAccount: string | null;
    isInAppWallet: boolean;
    client: Client | null;
    error: string | null;
    isRecoveryInProgress: boolean;
    isOperationInProgress: boolean;
    loadWallet: (password: string) => Promise<WalletOperationResult<PrivateKey>>;
    signTransaction: (transaction: string, password: string) => Promise<WalletOperationResult<{
        status: 'SUCCESS' | 'ERROR';
        transactionId: string | null;
    }>>;
    setInAppAccount: (accountId: string) => void;
    recoverKey: (userId: string) => Promise<WalletOperationResult<void>>;
    verifyMetadataSync: (currentMetadata: any, storedMetadata: any) => Promise<WalletOperationResult<boolean>>;
    setPasswordModalContext: (context: PasswordModalContext | ((prevContext: PasswordModalContext) => PasswordModalContext)) => void;
    walletType: 'inApp' | 'extension' | null;
}

interface WalletState {
    isInAppWallet: boolean;
    inAppAccount: string | null;
    inAppPrivateKey: PrivateKey | null;
    error: string | null;
    isRecoveryInProgress: boolean;
    isOperationInProgress: boolean;
    passwordModalContext: PasswordModalContext;
}

export const InAppWalletContext = createContext<InAppWalletContextType | undefined>(undefined);

export const InAppWalletProvider = ({ children }: { children: React.ReactNode }) => {
    const [walletState, setWalletState] = useState<WalletState>({
        isInAppWallet: false,
        inAppAccount: null,
        inAppPrivateKey: null,
        error: null,
        isRecoveryInProgress: false,
        isOperationInProgress: false,
        passwordModalContext: {
            isOpen: false,
            transaction: null,
            description: '',
            transactionPromise: null
        }
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

    // Improved error handling that doesn't throw
    const handleError = (error: Error | string | unknown): Error => {
        let actualError: Error;
        if (error instanceof Error) {
            actualError = error;
        } else if (typeof error === 'string') {
            actualError = new Error(error);
        } else {
            actualError = new Error('Unknown error occurred');
        }
        
        console.error(actualError.message, actualError);
        setWalletState(prev => ({ ...prev, error: actualError.message }));
        return actualError;
    };

    const loadWallet = async (password: string): Promise<WalletOperationResult<PrivateKey>> => {
        // Check operation state first, before any other operations
        if (walletState.isOperationInProgress) {
            setWalletState(prev => ({ ...prev, error: 'Operation in progress' }));
            return {
                success: false,
                error: 'Operation in progress'
            };
        }

        setWalletState(prev => ({ ...prev, isOperationInProgress: true, error: null }));
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) {
                throw new Error('No authenticated session');
            }

            const metadata = session.user.user_metadata;
            if (!metadata?.isInAppWallet || !metadata?.hederaAccountId) {
                throw new Error('No in-app wallet configured');
            }

            const decryptedKey = await retrievePrivateKey(session.user.id, password);
            if (!decryptedKey) {
                throw new Error('Failed to retrieve private key');
            }

            const privateKey = PrivateKey.fromString(decryptedKey);
            setWalletState(prev => ({
                ...prev,
                inAppPrivateKey: privateKey,
                error: null
            }));

            return {
                success: true,
                data: privateKey
            };
        } catch (error) {
            const handledError = handleError(error);
            return {
                success: false,
                error: handledError.message
            };
        } finally {
            setWalletState(prev => ({ ...prev, isOperationInProgress: false }));
        }
    };

    const signTransaction = async (transaction: string, password: string) => {
        if (walletState.isOperationInProgress || walletState.isRecoveryInProgress) {
            setWalletState(prev => ({ ...prev, error: 'Operation in progress' }));
            return {
                success: false,
                error: 'Operation in progress',
                data: {
                    status: 'ERROR' as const,
                    transactionId: null
                }
            };
        }

        setWalletState(prev => ({ ...prev, isOperationInProgress: true, error: null }));
        
        try {
            // Only try to load the wallet if a password is provided
            if (!password) {
                return {
                    success: false,
                    error: 'Password required',
                    data: {
                        status: 'ERROR' as const,
                        transactionId: null
                    }
                };
            }

            const loadResult = await loadWallet(password);
            if (!loadResult.success || !loadResult.data) {
                return {
                    success: false,
                    error: loadResult.error || 'Failed to load wallet',
                    data: {
                        status: 'ERROR' as const,
                        transactionId: null
                    }
                };
            }

            const tx = base64StringToTransaction(transaction);
            console.log("[InAppWalletContext] Decoded transaction:", {
                type: tx.constructor.name,
                hbarTransfers: tx instanceof TransferTransaction ? tx.hbarTransfers : null,
                transactionId: tx.transactionId?.toString(),
                nodeAccountIds: tx.nodeAccountIds?.map(id => id.toString())
            });

            const signedTx = await tx.sign(loadResult.data);
            console.log("[InAppWalletContext] Signed transaction:", {
                type: signedTx.constructor.name,
                hbarTransfers: signedTx instanceof TransferTransaction ? signedTx.hbarTransfers : null,
                transactionId: signedTx.transactionId?.toString(),
                nodeAccountIds: signedTx.nodeAccountIds?.map(id => id.toString())
            });

            // Log transaction details before execution
            if (tx instanceof TransferTransaction) {
                const transferTx = tx as TransferTransaction;
                console.log("[InAppWalletContext] Transaction Details:");
                console.log("- Sender Account ID:", walletState.inAppAccount);
                console.log("- HBAR Transfers:", transferTx.hbarTransfers);
                console.log("- Token Transfers:", transferTx.tokenTransfers);
                console.log("- Max Transaction Fee:", transferTx.maxTransactionFee?.toString());
            }

            console.log("[InAppWalletContext] Executing signed transaction...");
            const response = await signedTx.execute(client);
            console.log("[InAppWalletContext] Transaction executed, ID:", response.transactionId.toString());
            
            console.log("[InAppWalletContext] Waiting for transaction receipt...");
            const receiptPromise = response.getReceipt(client);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transaction receipt timeout')), 30000)
            );
            
            const receipt = await Promise.race([receiptPromise, timeoutPromise]) as TransactionReceipt;
            console.log("[InAppWalletContext] Transaction status:", receipt.status.toString());
            
            if (receipt.status._code !== 22) { // Not SUCCESS
                return {
                    success: false,
                    error: `Transaction failed with status: ${receipt.status.toString()}`,
                    data: {
                        status: 'ERROR' as const,
                        transactionId: response.transactionId.toString()
                    }
                };
            }

            return {
                success: true,
                data: {
                    status: 'SUCCESS' as const,
                    transactionId: response.transactionId.toString()
                }
            };
        } catch (error) {
            const handledError = handleError(error);
            return {
                success: false,
                error: handledError.message,
                data: {
                    status: 'ERROR' as const,
                    transactionId: null
                }
            };
        } finally {
            setWalletState(prev => ({ 
                ...prev, 
                isOperationInProgress: false,
                inAppPrivateKey: null 
            }));
        }
    };

    const verifyMetadataSync = async (
        currentMetadata: any, 
        storedMetadata: any
    ): Promise<WalletOperationResult<boolean>> => {
        try {
            if (!currentMetadata?.hederaAccountId || !storedMetadata?.hederaAccountId) {
                const error = new Error('Invalid metadata');
                console.error(error.message, error);
                return {
                    success: false,
                    error: error.message
                };
            }
            
            if (currentMetadata.hederaAccountId !== storedMetadata.hederaAccountId) {
                const error = new Error('Account metadata mismatch');
                console.error(error.message, error);
                return {
                    success: false,
                    error: error.message
                };
            }
            
            return {
                success: true,
                data: true
            };
        } catch (error) {
            const handledError = handleError(error);
            return {
                success: false,
                error: handledError.message
            };
        }
    };

    const recoverKey = async (userId: string): Promise<WalletOperationResult<void>> => {
        // Check both recovery and operation states
        if (walletState.isRecoveryInProgress || walletState.isOperationInProgress) {
            setWalletState(prev => ({ ...prev, error: 'Recovery already in progress' }));
            return {
                success: false,
                error: 'Recovery already in progress'
            };
        }
        
        setWalletState(prev => ({ 
            ...prev, 
            isRecoveryInProgress: true,
            isOperationInProgress: true,
            error: null 
        }));
        
        try {
            await attemptRecovery(userId);
            return { success: true };
        } catch (error) {
            const handledError = handleError(error);
            return {
                success: false,
                error: handledError.message
            };
        } finally {
            setWalletState(prev => ({ 
                ...prev, 
                isRecoveryInProgress: false,
                isOperationInProgress: false 
            }));
        }
    };

    return (
        <InAppWalletContext.Provider value={{
            inAppAccount: walletState.inAppAccount,
            isInAppWallet: walletState.isInAppWallet,
            client,
            error: walletState.error,
            isRecoveryInProgress: walletState.isRecoveryInProgress,
            isOperationInProgress: walletState.isOperationInProgress,
            loadWallet,
            signTransaction,
            setInAppAccount: (accountId: string) => 
                setWalletState(prev => ({ ...prev, inAppAccount: accountId })),
            recoverKey,
            verifyMetadataSync,
            setPasswordModalContext: (context: PasswordModalContext | ((prevContext: PasswordModalContext) => PasswordModalContext)) => 
                setWalletState(prev => ({ 
                    ...prev, 
                    passwordModalContext: typeof context === 'function' 
                        ? context(prev.passwordModalContext) 
                        : context 
                })),
            walletType: walletState.isInAppWallet ? 'inApp' : null
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