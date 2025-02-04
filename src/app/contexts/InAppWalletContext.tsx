"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { PrivateKey, AccountId, PublicKey, Transaction, Client, TransactionResponse } from "@hashgraph/sdk";
import { storePrivateKey, retrievePrivateKey, encrypt, decrypt } from '@/lib/utils/keyStorage';
import { useSupabase } from '@/app/hooks/useSupabase';

interface InAppWalletContextType {
  inAppAccount: string | null;
  inAppPrivateKey: PrivateKey | null;
  userId: string | null;
  createWallet: (password: string) => Promise<string>;
  loadWallet: (password: string) => Promise<void>;
  signTransaction: (transaction: string, password: string) => Promise<TransactionResponse>;
  isInAppWallet: boolean;
  backupKey: () => Promise<void>;
  recoverKey: (userId: string) => Promise<void>;
}

export const InAppWalletContext = createContext<InAppWalletContextType | null>(null);

async function createHederaAccount(publicKey: PublicKey) {
  // Call your backend API to create the account
  const response = await fetch('/api/wallet/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicKey: publicKey.toString() })
  });
  
  if (!response.ok) throw new Error('Failed to create Hedera account');
  const { accountId } = await response.json();
  return accountId;
}

export function InAppWalletProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabase();
  const [inAppAccount, setInAppAccount] = useState<string | null>(null);
  const [inAppPrivateKey, setInAppPrivateKey] = useState<PrivateKey | null>(null);
  const [isInAppWallet, setIsInAppWallet] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      const request = indexedDB.open('WalletDB', 1);
      
      request.onerror = () => {
        console.error("Error opening IndexedDB");
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('wallet')) {
          db.createObjectStore('wallet', { keyPath: 'id' });
        }
      };
    };

    initDB();
  }, []);

  const createWallet = async (password: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('No user session');

      // Generate new ED25519 key pair
      const privateKey = PrivateKey.generateED25519();
      const publicKey = privateKey.publicKey;
      
      // Create account on Hedera
      const accountId = await createHederaAccount(publicKey);
      
      // Store encrypted private key using the user's ID and password
      console.log('Storing private key for user:', session.user.id);
      await storePrivateKey(session.user.id, privateKey.toString(), password);
      
      setInAppAccount(accountId);
      setInAppPrivateKey(privateKey);
      setIsInAppWallet(true);

      return accountId;
    } catch (error) {
      console.error('Error creating wallet:', error);
      throw error;
    }
  };

  const loadWallet = async (password: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('No user session');

      const privateKeyString = await retrievePrivateKey(session.user.id, password);
      if (!privateKeyString) throw new Error('No private key found');

      const privateKey = PrivateKey.fromString(privateKeyString);
      setInAppPrivateKey(privateKey);
      // Load account ID from your backend or derive it from public key
      // setInAppAccount(accountId);
      setIsInAppWallet(true);
    } catch (error) {
      console.error('Error loading wallet:', error);
      throw error;
    }
  };

  const signTransaction = async (transaction: string, password: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('No user session');

      console.log('Attempting to retrieve private key for user:', session.user.id);
      const privateKey = await retrievePrivateKey(session.user.id, password);
      console.log('Private key retrieval result:', { hasKey: !!privateKey });

      if (!privateKey) throw new Error('No private key available');

      // Create signer from private key
      const signer = PrivateKey.fromString(privateKey);
      if (!inAppAccount) throw new Error('No account available');
      
      console.log('Setting up client with:', { 
        account: inAppAccount,
        hasPrivateKey: !!signer 
      });

      const client = Client.forTestnet();
      client.setOperator(AccountId.fromString(inAppAccount), signer);

      // Execute transaction
      return await Transaction.fromBytes(Buffer.from(transaction, 'base64'))
        .execute(client);
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      throw error;
    }
  };

  const backupKey = async () => {
    if (!inAppPrivateKey || !userId) {
      throw new Error('No private key or user ID available');
    }

    try {
      // Encrypt the private key with the user's password
      const encryptedKey = await encrypt(
        inAppPrivateKey.toStringRaw(),
        'your-encryption-key' // This should be derived from user password or other secure source
      );

      // Store the encrypted backup
      const response = await fetch('/api/wallet/key-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          encryptedKey,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to store key backup');
      }
    } catch (error) {
      console.error('Key backup failed:', error);
      throw error;
    }
  };

  const recoverKey = async (userId: string) => {
    try {
      // Retrieve the encrypted backup
      const response = await fetch('/api/wallet/key-backup', {
        headers: {
          'x-user-id': userId
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve key backup');
      }

      const { encryptedKey } = await response.json();

      // Decrypt the private key
      const privateKeyString = await decrypt(
        encryptedKey,
        'your-encryption-key' // This should be derived from user password or other secure source
      );

      // Restore the private key
      const recoveredKey = PrivateKey.fromString(privateKeyString);
      setInAppPrivateKey(recoveredKey);

      // Load associated account
      const publicKey = recoveredKey.publicKey;
      // ... load account details ...

    } catch (error) {
      console.error('Key recovery failed:', error);
      throw error;
    }
  };

  return (
    <InAppWalletContext.Provider value={{
      inAppAccount,
      inAppPrivateKey,
      userId,
      createWallet,
      loadWallet,
      signTransaction,
      isInAppWallet,
      backupKey,
      recoverKey
    }}>
      {children}
    </InAppWalletContext.Provider>
  );
}

export const useInAppWallet = () => {
  const context = useContext(InAppWalletContext);
  if (!context) {
    throw new Error('useInAppWallet must be used within an InAppWalletProvider');
  }
  return context;
}; 