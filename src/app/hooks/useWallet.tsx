"use client";
import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";
import { Client, LedgerId, AccountId } from "@hashgraph/sdk";
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
  ExtensionData,
  DAppSigner,
  base64StringToUint8Array
} from '@hashgraph/hedera-wallet-connect';
import { SessionTypes } from '@walletconnect/types';
import { supabase } from '@/utils/supabase';
import { SessionState } from '@/utils/supabase/session';
import { persistSession, getStoredSession, clearStoredSession } from '@/utils/supabase/session';
import { handleDisconnectSessions } from '@/utils/supabase/session';

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

interface ModalState {
  open: boolean;
}

interface ConnectionAttempt {
  promise: ((value: void | PromiseLike<void>) => void) | null;
  reject: ((reason?: any) => void) | null;
}

interface WalletContextType {
    account: string;
    handleConnect: () => Promise<void>;
    handleDisconnectSessions: () => Promise<void>;
    signAndExecuteTransaction: (params: { 
        transactionList: string, 
        signerAccountId: string
    }) => Promise<any>;
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
    setError: (error: string | null) => void;
    walletType: string | null;
    setAccount: (account: string) => void;
}

export const WalletContext = createContext<WalletContextType>({
    account: "",
    handleConnect: async () => {},
    handleDisconnectSessions: async () => {},
    signAndExecuteTransaction: async () => {},
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
            session: null as SessionTypes.Struct | null,
        },
        auth: {
            isAuthenticated: false,
            userId: null,
            session: null,
            user: null
        }
    },
    handleDisconnect: async () => {},
    setError: () => {},
    walletType: null,
    setAccount: () => {},
});

interface WalletProviderProps {
    children: ReactNode;
}

export const WalletProvider = ({ children }: WalletProviderProps) => {
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
      session: null,
      user: null
    }
  });
  const [walletType, setWalletType] = useState<string | null>(null);

  const init = useCallback(async () => {
    if (dAppConnector) {
      console.log("DAppConnector already initialized");
      return dAppConnector;
    }

    console.log("Initializing DAppConnector...");
    
    try {
      // Create new connector instance
      const connector = new DAppConnector(
        appMetadata,
        process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET,
        process.env.NEXT_PUBLIC_WALLETCONNECT_ID as string,
        Object.values(HederaJsonRpcMethod),
        [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
        [process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? HederaChainId.Mainnet : HederaChainId.Testnet]
      );

      // Initialize with existing state
      await connector.init();
      console.log("DAppConnector initialized successfully");
      
      setDAppConnector(connector);
      setSigners(connector.signers || []);
      setIsInitialized(true);

      // Set up event listeners
      if (connector.walletConnectClient) {
        connector.walletConnectClient.events.on('session_delete', () => {
          console.log('Session deleted');
          handleDisconnectSessions().catch(console.error);
        });

        // Check for existing sessions
        const existingSessions = connector.walletConnectClient.session.getAll();
        console.log("All existing sessions:", existingSessions);
        
        if (existingSessions.length > 0) {
          const validSessions = existingSessions.filter(session => 
            session.expiry > Math.floor(Date.now() / 1000)
          );
          
          if (validSessions.length > 0) {
            console.log("Found valid existing sessions:", validSessions);
            setSessions(validSessions);
            const accountId = validSessions[0].namespaces?.hedera?.accounts?.[0]?.split(':').pop();
            if (accountId) {
              setAccount(accountId);
              const storedSession = getStoredSession();
              if (storedSession?.auth?.session) {
                setSessionState({
                  wallet: {
                    isConnected: true,
                    accountId,
                    session: validSessions[0]
                  },
                  auth: storedSession.auth
                });
                supabase.auth.setSession(storedSession.auth.session).catch(console.error);
              }
            }
          } else {
            // Clean up expired sessions
            existingSessions.forEach(session => {
              connector.disconnect(session.topic).catch(console.error);
            });
            clearStoredSession();
          }
        }
      }

      console.log("Hedera Wallet Connect Initialization Complete");
      return connector;
    } catch (error) {
      console.error("Failed to initialize WalletConnect:", error);
      // Clean up on initialization failure
      setDAppConnector(null);
      setIsInitialized(false);
      setSessions([]);
      setSessionState({
        wallet: { isConnected: false, accountId: null, session: null },
        auth: { isAuthenticated: false, userId: null, session: null, user: null }
      });
      clearStoredSession();
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!isInitialized) {
      init().catch(console.error);
    }
  }, [isInitialized, init]);

  const handleConnect = async () => {
    console.log('handleConnect called');
    setIsConnecting(true);
    setError(null);

    try {
        const connector = dAppConnector || await init();
        if (!connector) {
            throw new Error("DApp Connector not initiated");
        }

        // Get new WalletConnect session
        const session = await connector.openModal();
        console.log("WalletConnect session response:", session);

        if (!session?.topic) {
            throw new Error('Invalid session response');
        }

        const accountId = session.namespaces?.hedera?.accounts?.[0]?.split(':').pop();
        if (!accountId) {
            throw new Error('No account ID in session');
        }

        // Set up WalletConnect state first
        setSessions([session]);
        setAccount(accountId);

        // Get signature for auth
        const message = "Authenticate with Lynxify";
        const signedMessage = await connector.signMessage({
            signerAccountId: accountId,
            message
        });

        // Authenticate with backend
        const response = await fetch('/api/auth/wallet-connect', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                accountId, 
                signature: signedMessage,
                message 
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to authenticate user');
        }

        const authData = await response.json();
        console.log('Auth response data:', authData);

        // Set up Supabase session
        if (authData.session) {
            // Set up Supabase auth first
            await supabase.auth.setSession(authData.session);
            
            // Then update all state atomically
            setUserId(authData.session.user.id);
            setSessionState({
                wallet: {
                    isConnected: true,
                    accountId,
                    session
                },
                auth: {
                    isAuthenticated: true,
                    userId: authData.session.user.id,
                    session: authData.session,
                    user: authData.session.user
                }
            });

            // Persist after everything is set up
            persistSession(session, authData.session);
        } else {
            throw new Error('No session returned from auth endpoint');
        }

    } catch (error: any) {
        console.error('Connection error:', error);
        await handleDisconnectSessions();
    } finally {
        setIsConnecting(false);
    }
  };

  useEffect(() => {
    const restoreSession = async () => {
      const storedSession = getStoredSession();
      if (storedSession?.wallet?.accountId && storedSession?.auth?.session) {
        try {
          // Restore Supabase session first
          await supabase.auth.setSession(storedSession.auth.session);
          
          // Then restore wallet state
          setAccount(storedSession.wallet.accountId);
          setSessionState(storedSession);
          setSessions(storedSession.wallet.session ? [storedSession.wallet.session] : []);
          setUserId(storedSession.auth.userId);
        } catch (error) {
          console.error('Failed to restore session:', error);
          clearStoredSession();
        }
      }
    };

    restoreSession();
  }, []);

  const handleDisconnect = useCallback(async () => {
    try {
      if (dAppConnector && sessions?.[0]) {
        await dAppConnector.disconnect(sessions[0].topic);
      }
      
      clearStoredSession();
      setSessions([]);
      setAccount('');
      setSessionState({
        wallet: { isConnected: false, accountId: null, session: null },
        auth: { isAuthenticated: false, userId: null, session: null, user: null }
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      // Force cleanup even on error
      clearStoredSession();
    }
  }, [dAppConnector, sessions]);

  const handleDisconnectSessions = async () => {
    try {
        // First disconnect WalletConnect sessions
        if (dAppConnector && sessions?.length > 0) {
            console.log('Disconnecting WalletConnect sessions...');
            for (const session of sessions) {
                try {
                    console.log('Disconnecting session:', session.topic);
                    await dAppConnector.disconnect(session.topic);
                    console.log('Successfully disconnected session:', session.topic);
                } catch (wcError) {
                    console.error('WalletConnect disconnect error for topic', session.topic, wcError);
                }
            }
        }

        // Sign out of Supabase and verify
        console.log('Starting Supabase sign out...');
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
            console.error('Supabase signOut error:', signOutError);
            throw signOutError;
        }

        // Verify session is cleared
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
            console.error('Session still exists after signout!');
            // Force session cleanup
            await supabase.auth.signOut({ scope: 'global' });
            // Check again
            const { data: { session: finalCheck } } = await supabase.auth.getSession();
            if (finalCheck) {
                throw new Error('Failed to clear Supabase session');
            }
        }
        console.log('Supabase session cleared successfully');

        // Only clear local state after confirming Supabase signout
        console.log('Clearing local state...');
        setSessions([]);
        setSigners([]);
        setAccount("");
        setUserId(null);
        setSessionState({
            wallet: { isConnected: false, accountId: null, session: null },
            auth: { isAuthenticated: false, userId: null, session: null, user: null }
        });

        // Clear stored session last
        console.log('Clearing stored session...');
        localStorage.removeItem('lynxify_session');
        
        console.log('Disconnect complete');
    } catch (error: any) {
        console.error('Error in handleDisconnectSessions:', error);
        // Even if there's an error, try to clear local state
        setSessions([]);
        setSigners([]);
        setAccount("");
        setUserId(null);
        setSessionState({
            wallet: { isConnected: false, accountId: null, session: null },
            auth: { isAuthenticated: false, userId: null, session: null, user: null }
        });
        localStorage.removeItem('lynxify_session');
        throw error;
    }
  };

  const signAndExecuteTransaction = async (params: { 
        transactionList: string;
        signerAccountId: string;
    }) => {
    if (!dAppConnector) {
        throw new Error("DAppConnector not initialized");
    }
    
    return await dAppConnector.signAndExecuteTransaction({
        signerAccountId: params.signerAccountId,
        transactionList: params.transactionList
    });
  };

  // Modify forceReconnect to be simpler and provide more debugging info
  const forceReconnect = async () => {
    try {
      const storedSession = getStoredSession();
      const storedAccountId = storedSession?.wallet?.accountId;
      
      if (storedAccountId) {
        console.log("Manually reconnecting wallet:", {
          accountId: storedAccountId,
          hasSession: !!storedSession?.wallet?.session,
          isInApp: storedSession?.wallet?.isInAppWallet
        });
        
        setAccount(storedAccountId);
        setWalletType(storedSession?.wallet?.isInAppWallet ? 'inApp' : 'extension');
        return true;
      }
      return false;
    } catch (error) {
      console.error("Force reconnect failed:", error);
      return false;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        account,
        handleConnect,
        handleDisconnectSessions,
        signAndExecuteTransaction,
        client: process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet(),
        appMetadata,
        sessions,
        signers,
        extensions,
        dAppConnector,
        userId,
        isConnecting,
        error,
        sessionState,
        handleDisconnect,
        setError: setError,
        walletType,
        setAccount,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWalletContext = () => {
  return useContext(WalletContext);
}