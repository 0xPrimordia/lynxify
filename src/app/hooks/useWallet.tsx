"use client";
import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";
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

interface WalletContextType {
    account: string;
    handleConnect: () => Promise<void>;
    handleDisconnectSessions: () => Promise<void>;
    signAndExecuteTransaction: (params: { 
        transactionList: string, 
        signerAccountId: string,
        password: string
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
    setError: () => {},
    walletType: null,
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
      session: null as SessionTypes.Struct | null,
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

  const init = useCallback(async () => {
    if (isInitialized) return;
    
    try {
      const storedSession = getStoredSession();
      
      if (!dAppConnector) {
        const network = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';
        const chainId = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? HederaChainId.Mainnet : HederaChainId.Testnet;
        const ledgerId = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;
        
        const methods = Object.values(HederaJsonRpcMethod);
        const events = [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged];
        const chains = [`hedera:${network}`];

        const newDAppConnector = new DAppConnector(
          appMetadata,
          ledgerId,
          process.env.NEXT_PUBLIC_WALLETCONNECT_ID!,
          methods,
          events,
          [chainId]
        );

        await newDAppConnector.init();
        
        setDAppConnector(newDAppConnector);
        setSigners(newDAppConnector.signers);
        setIsInitialized(true);

        if (storedSession?.wallet.session && storedSession?.auth.session) {
          try {
            const walletSessions = newDAppConnector.walletConnectClient?.session.getAll();
            const matchingSession = walletSessions?.find(ws => 
                ws.topic === storedSession.wallet.session?.topic
            );
            
            if (matchingSession) {
              setSessions([matchingSession]);
              setAccount(storedSession.wallet.accountId || "");
              
              if (storedSession.auth.session) {
                const { data, error } = await supabase.auth.setSession({
                  access_token: storedSession.auth.session.access_token,
                  refresh_token: storedSession.auth.session.refresh_token
                });
                
                if (!error && data.session) {
                  setUserId(storedSession.auth.userId || null);
                  setSessionState({
                    wallet: {
                      isConnected: true,
                      accountId: storedSession.wallet.accountId,
                      session: matchingSession || null,
                      isInAppWallet: false,
                      privateKey: null
                    },
                    auth: {
                      isAuthenticated: true,
                      userId: storedSession.auth.userId,
                      session: data.session,
                      user: data.session.user
                    }
                  });
                }
              }
            } else {
              clearStoredSession();
            }
          } catch (error) {
            console.error('Session restoration failed:', error);
            clearStoredSession();
          }
        }
      }
    } catch (error) {
      console.error("Initialization failed:", error);
      clearStoredSession();
    }
  }, [isInitialized, dAppConnector]);

  const restoreSession = useCallback(async (storedSession: SessionState) => {
    try {
      if (!dAppConnector) return;
      
      if (storedSession.wallet.session) {
        const walletSessions = dAppConnector.walletConnectClient?.session.getAll();
        const matchingSession = walletSessions?.find(ws => 
            ws.topic === storedSession.wallet.session?.topic
        );
        
        if (matchingSession) {
          setSessions([matchingSession]);
          setAccount(storedSession.wallet.accountId || "");
          
          setSessionState(prevState => ({
            ...prevState,
            wallet: {
              isConnected: true,
              accountId: storedSession.wallet.accountId,
              session: matchingSession as SessionTypes.Struct | null
            }
          }));
        } else {
          throw new Error("No matching wallet session found");
        }
      }

      if (storedSession.auth.session) {
        const { data, error } = await supabase.auth.setSession({
          access_token: storedSession.auth.session.access_token,
          refresh_token: storedSession.auth.session.refresh_token
        });
        
        if (error) throw error;
        
        setUserId(storedSession.auth.userId || null);
        
        setSessionState(prevState => ({
          ...prevState,
          auth: {
            isAuthenticated: true,
            userId: storedSession.auth.userId,
            session: data.session,
            user: data.session?.user || null
          }
        }));
      }

      return true;
    } catch (error) {
      console.error("Session restoration failed:", error);
      clearStoredSession();
      setSessionState({
        wallet: { isConnected: false, accountId: null, session: null },
        auth: { isAuthenticated: false, userId: null, session: null, user: null }
      });
      return false;
    }
  }, [dAppConnector]);

  useEffect(() => {
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      switch (event) {
        case 'SIGNED_OUT':
          setUserId(null);
          setAccount("");
          clearStoredSession();
          break;
          
        case 'INITIAL_SESSION':
        case 'SIGNED_IN': {
          if (session?.user) {
            setUserId(session.user.id);
            
            if (isInitialized && dAppConnector) {
              const storedSession = getStoredSession();
              if (storedSession?.wallet.session) {
                try {
                  await restoreSession(storedSession);
                } catch (error) {
                  console.error('Failed to restore wallet session:', error);
                  clearStoredSession();
                }
              }
            }
          }
          break;
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isInitialized, dAppConnector, init, restoreSession]);

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

        // Clear any existing sessions first
        if (sessions?.length > 0) {
            console.log('Clearing existing sessions before connect');
            await handleDisconnectSessions();
        }

        // Get session through modal or extension
        const session = extensionId ? 
            await dAppConnector.connectExtension(extensionId) : 
            await dAppConnector.openModal();

        const accountId = session.namespaces?.hedera?.accounts?.[0]?.split(':').pop();
        if (!accountId) {
            throw new Error('No account ID in session');
        }

        // Set wallet state
        setSessions([session]);
        setAccount(accountId);

        // Check if we already have a valid auth session
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        
        if (existingSession?.user) {
            console.log('Found existing auth session, skipping authentication');
            setUserId(existingSession.user.id);
            persistSession(session, existingSession);
            return;
        }

        console.log('No existing auth session, requesting signature');
        const message = `Authenticate with Lynxify: ${Date.now()}`;
        const signedMessage = await dAppConnector.signMessage({
            signerAccountId: accountId,
            message
        });

        const sessionAccount = session.namespaces?.hedera?.accounts?.[0];
        if (sessionAccount) {
            const accountId = sessionAccount.split(':').pop();
            if (!accountId) throw new Error("Failed to extract account ID");
            
            console.log('Account ID:', accountId);

            // First check if user exists in database
            const { data: users } = await supabase
                .from('Users')
                .select('*')
                .eq('hederaAccountId', accountId);
            
            const existingUser = users && users.length > 0 ? users[0] : null;
            if (!existingUser) {
                // Only request signature if user doesn't exist
                const message = "Authenticate with Lynxify";
                const signParams = {
                    signerAccountId: accountId,
                    message: message,
                };

                console.log('Sign params:', signParams);
                try {
                    const signedMessage = await dAppConnector.signMessage(signParams);
                    console.log('Signed message from dAppConnector:', signedMessage);

                    const dataToSend = { 
                        accountId, 
                        signature: signedMessage,
                        message 
                    };

                    const response = await fetch('/api/auth/wallet-connect', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(dataToSend),
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to authenticate user');
                    }

                    const authData = await response.json();
                    console.log('Auth response data:', authData);

                    if (authData.session) {
                        await supabase.auth.setSession(authData.session);
                    }

                    if (authData.token) {
                        localStorage.setItem('authToken', authData.token);
                    }
                } catch (signError: any) {
                    console.error('Error signing or authenticating:', signError);
                    setError(signError.message || 'Failed to sign message or authenticate');
                    return;
                }
            }

            // Set the account regardless of whether signature was needed
            setAccount(accountId);
            
            const { data: { session: supabaseSession } } = await supabase.auth.getSession();
            if (supabaseSession?.user) {
                console.log('Setting userId from session:', supabaseSession.user.id);
                setUserId(supabaseSession.user.id);
            } else {
                console.log('No valid session found after connection');
                // Optionally refresh the session
                const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
                if (refreshedSession?.user) {
                    console.log('Setting userId from refreshed session:', refreshedSession.user.id);
                    setUserId(refreshedSession.user.id);
                }
            }
        }

        // Authenticate with backend
        const response = await fetch('/api/auth/wallet-connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                accountId, 
                signature: signedMessage,
                message 
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Authentication failed: ${errorData.error || 'Unknown error'}`);
        }

        const { session: authSession } = await response.json();
        setUserId(authSession.user.id);
        persistSession(session, authSession);

    } catch (error: any) {
        console.error('Connection error:', error);
        setError(error.message);
        clearStoredSession();
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
        transactionList: string, 
        signerAccountId: string,
        password: string
    }) => {
    if (!dAppConnector) {
      throw new Error("DAppConnector not initialized");
    }
    
    const result = await dAppConnector.signAndExecuteTransaction({
      signerAccountId: params.signerAccountId,
      transactionList: params.transactionList,
      password: params.password
    } as any);  // Type assertion to bypass the type check
    
    return result;
  };

  const handleDisconnect = useCallback(async () => {
    try {
        if (dAppConnector && sessions) {
            // Disconnect WalletConnect sessions
            for (const session of sessions) {
                await dAppConnector.disconnect(session.topic);
            }
        }
        
        // Clear stored session and Supabase auth
        await clearStoredSession();
        
        // Reset local state
        setAccount('');
        setUserId(null);
        setSessions([]);
        setSessionState({
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
    } catch (error) {
        console.error('Error disconnecting:', error);
        setError(error instanceof Error ? error.message : 'Failed to disconnect');
    }
  }, [dAppConnector, sessions]);

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
        walletType: null,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWalletContext = () => {
  return useContext(WalletContext);
}