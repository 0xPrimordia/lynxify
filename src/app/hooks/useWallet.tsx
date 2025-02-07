"use client";
import { ReactNode, createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { Client, LedgerId } from "@hashgraph/sdk";
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
  ExtensionData,
  DAppSigner,
} from '@hashgraph/hedera-wallet-connect';
import { SessionTypes } from '@walletconnect/types';
import { browserClient as supabase } from '@/utils/supabase';
import { SessionState, persistSession, clearStoredSession, getStoredSession } from '@/utils/supabase/session';
import { handleDisconnectSessions } from '@/utils/supabase/session';
import { useInAppWallet } from '../contexts/InAppWalletContext';
import { useSupabase } from './useSupabase';
import { TransactionResponse } from '@hashgraph/sdk';
import { SignAndExecuteTransactionResult } from '@hashgraph/hedera-wallet-connect';

declare global {
  interface Window {
    hashpack?: any;
  }
}

const appMetadata = {
    name: "Lynxify",
    description: "A Dex on Hedera for high volume trading",
    icons: ["/share-image.png"],
    url: process.env.NEXT_PUBLIC_APP_URL as string
}

type TransactionResult = TransactionResponse | SignAndExecuteTransactionResult;
type WalletType = 'extension' | 'inApp' | null;

interface WalletContextType {
    account: string;
    handleConnect: () => Promise<void>;
    handleDisconnectSessions: () => Promise<void>;
    signAndExecuteTransaction: (params: { transactionList: string, signerAccountId: string }) => Promise<any>;
    client: Client;
    appMetadata: typeof appMetadata;
    sessions?: SessionTypes.Struct[];
    signers: DAppSigner[];
    extensions: ExtensionData[];
    dAppConnector: DAppConnector | null;
    userId: string | null;
    isConnecting: boolean;
    error: string | null;
    sessionState: SessionState;
    handleDisconnect: () => Promise<void>;
}

export const WalletContext = createContext<WalletContextType>({
    account: "",
    handleConnect: async () => {},
    handleDisconnectSessions: async () => {},
    signAndExecuteTransaction: async (params: { 
      transactionList: string, 
      signerAccountId: string,
    }): Promise<TransactionResult> => {
      throw new Error("Context not initialized");
    },
    client: process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet(),
    appMetadata,
    sessions: [],
    signers: [],
    extensions: [],
    dAppConnector: null,
    userId: null,
    isConnecting: false,
    error: null,
    sessionState: {
        wallet: {
            isConnected: false,
            accountId: null,
            session: null,
            isInAppWallet: false,
            privateKey: null
        },
        auth: {
            isAuthenticated: false,
            userId: null,
            session: null,
            user: null
        }
    },
    handleDisconnect: async () => {},
});

interface WalletProviderProps {
    children: ReactNode;
}

export const WalletProvider = ({children}: WalletProviderProps) => {
  const [sessions, setSessions] = useState<SessionTypes.Struct[]>([]);
  const [signers, setSigners] = useState<string[]>([]);
  const [account, setAccount] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [sessionState, setSessionState] = useState<SessionState>({
    wallet: {
        isConnected: false,
        accountId: null,
        session: null,
        isInAppWallet: false,
        privateKey: null
    },
    auth: {
        isAuthenticated: false,
        userId: null,
        session: null,
        user: null
    }
  });

  const inAppWallet = useContext(InAppWalletContext);
  const dAppConnector = useMemo(() => new DAppConnector(appMetadata), []);

  // Initialize from stored session
  useEffect(() => {
    const storedSession = getStoredSession();
    if (storedSession) {
      setSessionState(storedSession);
      if (storedSession.wallet.isInAppWallet) {
        setWalletType('inApp');
        restoreInAppSession();
      } else if (storedSession.wallet.session) {
        setWalletType('extension');
        setSessions([storedSession.wallet.session]);
      }
    }
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const { session, accountId } = await initializeWalletConnection();
      
      // Handle signature verification if needed
      if (needsSignatureVerification) {
        // ... signature verification logic remains the same
      }

      // Update session state
      const { data: { session: authSession } } = await supabase.auth.getSession();
      
      if (authSession?.user) {
        await persistSession(session, authSession);
        setSessionState({
          wallet: {
            isConnected: true,
            accountId,
            session
          },
          auth: {
            isAuthenticated: true,
            userId: authSession.user.id,
            session: authSession,
            user: authSession.user
          }
        });
      }

      setAccount(accountId);
      setWalletType('extension');

    } catch (error: any) {
      console.error('Connection error:', error);
      setError(error.message);
      await clearStoredSession();
    } finally {
      setIsConnecting(false);
    }
  };

  // ... initializeWalletConnection remains the same

  const handleDisconnect = async () => {
    try {
      if (dAppConnector && sessions?.length > 0) {
        await Promise.all(
          sessions.map(session => 
            dAppConnector.disconnect(session.topic).catch(console.error)
          )
        );
      }
      
      setSessions([]);
      setAccount("");
      setUserId(null);
      setSessionState({
        wallet: { 
          isConnected: false, 
          accountId: null, 
          session: null,
          isInAppWallet: false,
          privateKey: null
        },
        auth: { 
          isAuthenticated: false, 
          userId: null, 
          session: null,
          user: null
        }
      });

      await clearStoredSession();
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!session) {
          await handleDisconnect();
        } else {
          await persistSession(
            sessionState.wallet.session,
            session,
            sessionState.wallet.isInAppWallet,
            inAppWallet?.inAppPrivateKey || null
          );
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [sessionState, walletType]);

  return (
    <WalletContext.Provider
      value={{
        account,
        handleConnect,
        handleDisconnectSessions,
        signAndExecuteTransaction: async (params: { 
          transactionList: string, 
          signerAccountId: string,
        }): Promise<TransactionResult> => {
          throw new Error("Context not initialized");
        },
        client: process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet(),
        appMetadata,
        sessions,
        signers: [],
        extensions: [],
        dAppConnector,
        userId,
        isConnecting,
        error,
        sessionState,
        handleDisconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWalletContext = () => {
  return useContext(WalletContext);
}