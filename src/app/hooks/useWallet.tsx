"use client";
import { ReactNode, createContext, useContext, useState, useEffect } from "react";
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
import { supabase } from '@/utils/supabase';
import { SessionState } from '@/app/types';
import { persistSession, getStoredSession, clearStoredSession } from '@/utils/supabase/session';

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
}

export const WalletContext = createContext<WalletContextType>({
    account: "",
    handleConnect: async () => {},
    handleDisconnectSessions: async () => {},
    signAndExecuteTransaction: async () => {},
    client: Client.forTestnet(),
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
            session: null
        },
        auth: {
            isAuthenticated: false,
            userId: null,
            session: null
        }
    }
});

interface WalletProviderProps {
    children: ReactNode;
}

export const WalletProvider = ({children}: WalletProviderProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessions, setSessions] = useState<SessionTypes.Struct[]>([]);
  const [signers, setSigners] = useState<DAppSigner[]>([]);
  const [account, setAccount] = useState<string>("");
  const [extensions, setExtensions] = useState<ExtensionData[]>([]);
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>({
    wallet: {
      isConnected: false,
      accountId: null,
      session: null
    },
    auth: {
      isAuthenticated: false,
      userId: null,
      session: null
    }
  });

  const initializeDAppConnector = async (walletSession: any) => {
    if (!dAppConnector) {
        console.error('DAppConnector not initialized');
        return false;
    }
    try {
        const sessions = dAppConnector.walletConnectClient?.session.getAll();
        const matchingSession = sessions?.find(ws => 
            ws.topic === walletSession.topic
        );
        
        if (matchingSession) {
            console.log("Restoring wallet connection...");
            setSessions([matchingSession]);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Failed to initialize DAppConnector:', error);
        return false;
    }
  };

  useEffect(() => {
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', { event, session });
      
      switch (event) {
        case 'SIGNED_OUT':
          console.log('User signed out, clearing session');
          setUserId(null);
          setAccount("");
          clearStoredSession();
          break;
          
        case 'INITIAL_SESSION': {
          const storedSession = getStoredSession();
          console.log('Raw stored session data:', {
            auth: storedSession?.auth,
            session: storedSession?.auth?.session,
            sessionType: typeof storedSession?.auth?.session,
            sessionKeys: storedSession?.auth?.session ? Object.keys(storedSession.auth.session) : []
          });
          
          if (storedSession?.auth.session) {
            console.log('Found stored session, attempting restoration');
            try {
              await supabase.auth.setSession({
                access_token: storedSession.auth.session.access_token,
                refresh_token: storedSession.auth.session.refresh_token
              });

              if (storedSession.wallet.session) {
                await initializeDAppConnector(storedSession.wallet.session);
              }
              
              setUserId(storedSession.auth.userId);
              if (storedSession.wallet.accountId) {
                setAccount(storedSession.wallet.accountId);
              }
            } catch (error) {
              console.error('Session restoration failed:', error);
              clearStoredSession();
            }
          }
          break;
        }
          
        case 'SIGNED_IN':
          if (session?.user?.id) {
            setUserId(session.user.id);
            const hederaAccountId = session.user.user_metadata?.hederaAccountId;
            if (hederaAccountId) {
              setAccount(hederaAccountId);
            }
          }
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const init = async () => {
    if (isInitialized) return;
    
    try {
      console.log("Initializing wallet and checking for existing session...");
      
      // Check stored session first
      const storedSession = getStoredSession();
      console.log('Retrieved stored session:', storedSession);

      if (!dAppConnector) {
        console.log('Creating new DAppConnector instance');
        
        const dAppConnector = new DAppConnector(
          appMetadata,
          LedgerId.TESTNET,
          process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
          Object.values(HederaJsonRpcMethod),
          [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
          [HederaChainId.Testnet]
        );

        await dAppConnector.init();
        setDAppConnector(dAppConnector);
        setSigners(dAppConnector.signers);
        setIsInitialized(true);
      }

      // Continue with session restoration if needed
      if (storedSession?.wallet.session && storedSession?.auth.session) {
        await restoreSession(storedSession);
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      clearStoredSession();
    }
  };

  // New helper function to handle session restoration
  const restoreSession = async (storedSession: SessionState) => {
    try {
        if (!dAppConnector) return;
        
        // First restore wallet session
        if (storedSession.wallet.session) {
            const walletSessions = dAppConnector.walletConnectClient?.session.getAll();
            const matchingSession = walletSessions?.find(ws => 
                ws.topic === storedSession.wallet.session?.topic
            );
            
            if (matchingSession) {
                console.log("Restoring wallet session...");
                setSessions([matchingSession]);
                setAccount(storedSession.wallet.accountId || "");
            } else {
                console.log("No matching wallet session found");
                throw new Error("No matching wallet session found");
            }
        }

        // Then restore auth session
        if (storedSession.auth.session) {
            console.log("Restoring auth session...");
            const { error } = await supabase.auth.setSession({
                access_token: storedSession.auth.session.access_token,
                refresh_token: storedSession.auth.session.refresh_token
            });
            
            if (error) {
                console.error("Auth session restoration failed:", error);
                throw error;
            }
            
            setUserId(storedSession.auth.userId || null);
        }

        return true;
    } catch (error) {
        console.error("Session restoration failed:", error);
        clearStoredSession();
        return false;
    }
  };

  const handleConnect = async (extensionId?: string) => {
    console.log('handleConnect called');
    setIsConnecting(true);
    setError(null);

    try {
      if (!dAppConnector) {
        await init();
      }

      if (!dAppConnector) {
        throw new Error("DApp Connector not initiated");
      }

      // Check if there's an existing session
      const existingSessions = dAppConnector.walletConnectClient?.session.getAll();
      if (existingSessions && existingSessions.length > 0) {
        const session = existingSessions[0];
        const accountId = session.namespaces?.hedera?.accounts?.[0]?.split(':').pop();
        if (accountId) {
          setAccount(accountId);
          setSessions([session]);
          return;
        }
      }

      // Otherwise create new session
      const session = extensionId ? 
        await dAppConnector.connectExtension(extensionId) : 
        await dAppConnector.openModal();

      const accountId = session.namespaces?.hedera?.accounts?.[0]?.split(':').pop();
      if (!accountId) {
        throw new Error('No account ID in session');
      }

      setSessions([session]);
      setAccount(accountId);

    } catch (error: any) {
      console.error('Connection error:', error);
      setError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Helper function to establish wallet connection
  const initializeWalletConnection = async () => {
    if (!dAppConnector) {
      throw new Error('DApp connector not initialized');
    }

    // Reuse existing session if available
    if (sessions?.[0]) {
      const accountId = sessions[0].namespaces?.hedera?.accounts?.[0]?.split(':').pop();
      return { session: sessions[0], accountId };
    }

    try {
      const session = await dAppConnector.connect((uri) => {
        if (window.hashpack) {
          window.hashpack.openWalletConnect(uri);
        }
      });

      const accountId = session.namespaces?.hedera?.accounts?.[0]?.split(':').pop();

      if (!accountId) {
        throw new Error('No account ID in session');
      }

      setSessions([session]);
      return { session, accountId };
    } catch (error) {
      console.error('Failed to establish wallet connection:', error);
      throw error;
    }
  };

  const handleDisconnectSessions = async () => {
    try {
        if (dAppConnector) {
            await dAppConnector.disconnectAll();
        }
        await supabase.auth.signOut();
        
        setSessions([]);
        setSigners([]);
        setAccount("");
        setUserId(null);
        
        clearStoredSession();
    } catch (error: any) {
        console.error('Error disconnecting sessions:', error);
        setError(error.message || 'Failed to disconnect sessions');
        
        // Force reset state even if disconnect fails
        setSessions([]);
        setSigners([]);
        setAccount("");
        setUserId(null);
        clearStoredSession();
    }
  };

  const signAndExecuteTransaction = async (params: { transactionList: string, signerAccountId: string }) => {
    if (!dAppConnector) {
      throw new Error("DAppConnector not initialized");
    }
    
    const result = await dAppConnector.signAndExecuteTransaction({
      signerAccountId: params.signerAccountId,
      transactionList: params.transactionList
    });
    
    return result;
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        handleConnect,
        handleDisconnectSessions,
        signAndExecuteTransaction,
        client: Client.forTestnet(),
        appMetadata,
        sessions,
        signers,
        extensions,
        dAppConnector,
        userId,
        isConnecting,
        error,
        sessionState
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWalletContext = () => {
  return useContext(WalletContext);
}