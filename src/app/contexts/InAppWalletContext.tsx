"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PrivateKey, Transaction, TransactionId, Client, AccountCreateTransaction, Hbar, TransactionReceipt } from "@hashgraph/sdk";
import { supabase } from '@/utils/supabase';
import { base64StringToTransaction } from "@hashgraph/hedera-wallet-connect";
import { decrypt } from '@/lib/utils/encryption';
interface InAppWalletContextType {
  inAppAccount: string | null;
  isInAppWallet: boolean;
  client: Client | null;
  error: string | null;
  loadWallet: (password: string) => Promise<PrivateKey | null>;
  signTransaction: (transaction: string, password: string) => Promise<any>;
  setInAppAccount: (accountId: string) => void;
  recoverKey: (userId: string) => Promise<void>;
}

export const InAppWalletContext = createContext<InAppWalletContextType | undefined>(undefined);

interface InAppWalletState {
    isConnected: boolean;
    accountId: string | null;
    privateKey: PrivateKey | null;
}

export const InAppWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [walletState, setWalletState] = useState<InAppWalletState>({
    isConnected: false,
    accountId: null,
    privateKey: null
  });
  
  // Add ref to track loading state
  const isLoadingRef = useRef(false);

  const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' 
    ? Client.forMainnet() 
    : Client.forTestnet();

  // Check if user has an in-app wallet on mount
  useEffect(() => {
    const checkInAppWallet = async () => {
      console.log('Checking in-app wallet session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get the user's metadata
      const { data: userData, error } = await supabase
        .from('Users')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      console.log('User data:', {
        hasSession: !!session,
        userData,
        error
      });

      if (userData?.hederaAccountId) {
        console.log('Setting wallet state with account:', userData.hederaAccountId);
        setWalletState({
          isConnected: true,
          accountId: userData.hederaAccountId,
          privateKey: null
        });
      } else {
        console.log('No in-app wallet found for user:', session?.user?.id);
      }
    };

    checkInAppWallet();
  }, []);

  const loadWallet = async (password: string) => {
    console.log('Loading wallet with password length:', password.length);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) throw new Error("No authenticated session");

        // Single DB connection with timeout
        const db = await Promise.race([
            new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open('HederaWallet', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error("Database connection timeout")), 5000)
            )
        ]);

        try {
            const encryptedKey = await new Promise<string>((resolve, reject) => {
                const transaction = (db as IDBDatabase).transaction(['keys'], 'readonly');
                const store = transaction.objectStore('keys');
                const request = store.get(session.user.id);
                
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    if (!request.result?.encryptedKey) {
                        reject(new Error("No key found in store"));
                        return;
                    }
                    resolve(request.result.encryptedKey);
                };
            });

            const decryptedKey = await decrypt(encryptedKey, password);
            return PrivateKey.fromString(decryptedKey);
        } finally {
            (db as IDBDatabase).close(); // Ensure DB connection is closed
        }
    } catch (error) {
        console.error('Error in loadWallet:', error);
        throw error; // Re-throw to propagate to UI
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
            privateKey: null
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
            privateKey: null
        }));
        
        return {
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Transaction signing failed',
            transactionId: null
        };
    }
  };

  const recoverKey = async (userId: string) => {
    // Implementation for recovering key
  };

  return (
    <InAppWalletContext.Provider value={{
      inAppAccount: walletState.accountId,
      isInAppWallet: walletState.isConnected,
      client,
      error: null,
      loadWallet,
      signTransaction,
      setInAppAccount: (accountId: string) => setWalletState(prev => ({ ...prev, accountId })),
      recoverKey
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