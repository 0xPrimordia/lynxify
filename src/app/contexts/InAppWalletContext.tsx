"use client";

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { PrivateKey, Transaction, TransactionId, Client, AccountCreateTransaction, Hbar } from "@hashgraph/sdk";
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
    // Atomic check and set
    if (isLoadingRef.current) {
        console.log('Wallet load already in progress');
        return null;
    }
    isLoadingRef.current = true;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Loading wallet for user:', session?.user?.id);

        if (!session?.user?.id) throw new Error("No authenticated session");

        // Get all keys to help with debugging
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('HederaWallet', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });

        const encryptedKey = await new Promise<string>((resolve, reject) => {
            const transaction = db.transaction(['keys'], 'readonly');
            const store = transaction.objectStore('keys');
            
            // Log all keys for debugging
            store.getAllKeys().onsuccess = (event) => {
                const keys = (event.target as IDBRequest).result;
                console.log('All stored keys:', keys);
            };
            
            const request = store.get(session.user.id);
            
            request.onerror = () => reject(new Error('Failed to retrieve key from IndexedDB'));
            request.onsuccess = () => {
                console.log('Key lookup result:', {
                    userId: session.user.id,
                    hasResult: !!request.result,
                    hasEncryptedKey: !!request.result?.encryptedKey
                });
                resolve(request.result?.encryptedKey);
            }
        });

        if (!encryptedKey) {
            throw new Error("No stored key found");
        }

        // Decrypt the private key
        const decryptedKey = await decrypt(encryptedKey, password);
        const privateKey = PrivateKey.fromString(decryptedKey);
        
        setWalletState(prev => ({
            ...prev,
            privateKey
        }));

        return privateKey;
    } catch (error) {
        console.error('Error in loadWallet:', error);
        throw error;
    } finally {
        isLoadingRef.current = false;
    }
  };

  const signTransaction = async (transaction: string, password: string) => {
    console.log("Starting signTransaction");
    try {
        // Always load a fresh key for signing
        const privateKey = await loadWallet(password);
        if (!privateKey) throw new Error("Failed to load private key");
        
        // Convert base64 string back to Transaction object
        const tx = base64StringToTransaction(transaction);
        
        // Sign and execute
        const signedTx = await tx.sign(privateKey);
        const response = await signedTx.execute(client);
        const receipt = await response.getReceipt(client);
        
        // Clear private key after signing
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
        console.error("Transaction signing error:", error);
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