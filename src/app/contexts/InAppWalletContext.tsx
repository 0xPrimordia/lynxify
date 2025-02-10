"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { PrivateKey } from "@hashgraph/sdk";
import { supabase } from '@/utils/supabase';

interface InAppWalletContextType {
  inAppAccount: string | null;
  isInAppWallet: boolean;
  loadWallet: (password: string) => Promise<void>;
  signTransaction: (transaction: any, password: string) => Promise<any>;
  setInAppAccount: (accountId: string) => void;
}

const InAppWalletContext = createContext<InAppWalletContextType | undefined>(undefined);

export const InAppWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [inAppAccount, setInAppAccount] = useState<string | null>(null);
  const [inAppPrivateKey, setInAppPrivateKey] = useState<PrivateKey | null>(null);
  const [isInAppWallet, setIsInAppWallet] = useState(false);

  // Check if user has an in-app wallet on mount
  useEffect(() => {
    const checkInAppWallet = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.user_metadata?.isInAppWallet) {
        setIsInAppWallet(true);
        setInAppAccount(session.user.user_metadata.hederaAccountId);
      }
    };

    checkInAppWallet();
  }, []);

  const loadWallet = async (password: string) => {
    // Implementation for loading private key with password
  };

  const signTransaction = async (transaction: any, password: string) => {
    // Implementation for signing transactions
  };

  return (
    <InAppWalletContext.Provider value={{
      inAppAccount,
      isInAppWallet,
      loadWallet,
      signTransaction,
      setInAppAccount
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