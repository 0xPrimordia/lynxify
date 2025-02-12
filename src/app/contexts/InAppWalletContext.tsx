"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { PrivateKey, Transaction, TransactionId, Client, AccountCreateTransaction, Hbar } from "@hashgraph/sdk";
import { supabase } from '@/utils/supabase';
import { base64StringToTransaction } from "@hashgraph/hedera-wallet-connect";
import { decrypt } from '@/lib/utils/encryption';
interface InAppWalletContextType {
  inAppAccount: string | null;
  isInAppWallet: boolean;
  client: Client | null;
  error: string | null;
  loadWallet: (password: string) => Promise<PrivateKey>;
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
    try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Session:', session?.user?.id);
        if (!session?.user?.id) throw new Error("No authenticated session");

        // Open IndexedDB
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('HederaWallet', 1);
            request.onerror = () => reject(new Error('Failed to open IndexedDB'));
            request.onsuccess = () => resolve(request.result);
        });

        // Get encrypted key from store
        const encryptedKey = await new Promise<string>((resolve, reject) => {
            const transaction = db.transaction(['keys'], 'readonly');
            const store = transaction.objectStore('keys');
            const request = store.get(session.user.id);
            
            request.onerror = () => reject(new Error('Failed to retrieve key from IndexedDB'));
            request.onsuccess = () => {
                console.log('Retrieved from IndexedDB:', request.result);
                resolve(request.result?.encryptedKey);
            }
        });

        console.log('Encrypted key found:', !!encryptedKey);

        if (!encryptedKey) throw new Error("No stored key found");

        // Decrypt the private key
        const decryptedKey = await decrypt(encryptedKey, password);
        console.log('Decrypted key obtained:', !!decryptedKey);
        
        const privateKey = PrivateKey.fromString(decryptedKey);
        console.log('Private key created:', !!privateKey);
        
        // Set the state and verify it was set
        setWalletState(prev => {
            const newState = { ...prev, privateKey };
            console.log('New wallet state:', !!newState.privateKey);
            return newState;
        });
        
        // Wait a tick to ensure state is updated
        await new Promise(resolve => setTimeout(resolve, 0));
        
        console.log('Final wallet state:', !!walletState.privateKey);
        
        return privateKey;
    } catch (error) {
        console.error('Error in loadWallet:', error);
        throw error;
    }
  };

  const signTransaction = async (transaction: string, password: string) => {
    console.log("Starting signTransaction");
    try {
        // Load the key and use it directly
        const privateKey = !walletState.privateKey ? await loadWallet(password) : walletState.privateKey;
        
        // Convert base64 string back to Transaction object
        const tx = base64StringToTransaction(transaction);
        
        // Sign the transaction with the private key
        const signedTx = await tx.sign(privateKey);
        
        // Execute the transaction
        const response = await signedTx.execute(client);
        
        // Get receipt to confirm success
        const receipt = await response.getReceipt(client);
        
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

  const createAccount = async (privateKey: PrivateKey) => {
    const transaction = new AccountCreateTransaction()
        .setKey(privateKey.publicKey)
        .setInitialBalance(new Hbar(0))
        .setMaxAutomaticTokenAssociations(-1);  // -1 means unlimited auto-associations
        
    const response = await transaction.execute(client);
    const receipt = await response.getReceipt(client);
    return receipt.accountId;
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