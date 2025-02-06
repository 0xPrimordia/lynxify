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
import { SessionState } from '@/app/types';
import { persistSession, getStoredSession, clearStoredSession } from '@/utils/supabase/session';
import { handleDisconnectSessions } from '@/utils/supabase/session';
import { useInAppWallet } from '../contexts/InAppWalletContext';
import { useSupabase } from './useSupabase';
import { TransactionResponse } from '@hashgraph/sdk';
import { SignAndExecuteTransactionResult } from '@hashgraph/hedera-wallet-connect';
import SessionPasswordManager from '@/lib/utils/sessionPassword';
import { SessionPasswordModal } from '@/app/components/SessionPasswordModal';

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

interface WalletContextType {
    account: string;
    activeAccount: string | null;
    handleConnect: (extensionId?: string) => Promise<void>;
    handleDisconnectSessions: () => Promise<void>;
    signAndExecuteTransaction: (params: { 
      transactionList: string, 
      signerAccountId: string,
      password: string 
    }) => Promise<TransactionResult>;
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
    walletType: 'extension' | 'inApp' | null;
    handleConnectInAppWallet: (email: string, password: string) => Promise<void>;
    setIsConnecting: (isConnecting: boolean) => void;
}

export const WalletContext = createContext<WalletContextType>({
    account: "",
    activeAccount: null,
    handleConnect: async () => {},
    handleDisconnectSessions: async () => {},
    signAndExecuteTransaction: async (params: { 
      transactionList: string, 
      signerAccountId: string,
      password: string 
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
            session: null
        },
        auth: {
            isAuthenticated: false,
            userId: null,
            session: null
        }
    },
    handleDisconnect: async () => {},
    setError: () => {},
    walletType: null,
    handleConnectInAppWallet: async () => {},
    setIsConnecting: () => {},
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
  const [walletType, setWalletType] = useState<'extension' | 'inApp' | null>(null);
  const inAppWallet = useInAppWallet();
  const { supabase } = useSupabase();
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingSessionRestore, setPendingSessionRestore] = useState(false);
  
  // Calculate active account based on wallet type
  const activeAccount = account || (walletType === 'inApp' ? userAccountId : null);

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
                      session: matchingSession
                    },
                    auth: {
                      isAuthenticated: true,
                      userId: storedSession.auth.userId,
                      session: data.session
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
              session: matchingSession
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
            session: data.session
          }
        }));
      }

      return true;
    } catch (error) {
      console.error("Session restoration failed:", error);
      clearStoredSession();
      setSessionState({
        wallet: { isConnected: false, accountId: null, session: null },
        auth: { isAuthenticated: false, userId: null, session: null }
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

  const handleConnect = async () => {
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

        // Open modal for wallet selection
        const session = await dAppConnector.openModal();

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
            auth: { isAuthenticated: false, userId: null, session: null }
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
            auth: { isAuthenticated: false, userId: null, session: null }
        });
        localStorage.removeItem('lynxify_session');
        throw error;
    }
  };

  type TransactionResult = TransactionResponse | SignAndExecuteTransactionResult;

  const signAndExecuteTransaction = async (params: { 
    transactionList: string, 
    signerAccountId: string,
    password: string 
  }): Promise<TransactionResult> => {
    if (walletType === 'inApp') {
        if (!inAppWallet.inAppPrivateKey) {
            throw new Error("No private key available for in-app wallet");
        }
        return inAppWallet.signTransaction(params.transactionList, params.password);
    } else {
        return dAppConnector?.signAndExecuteTransaction({
            signerAccountId: params.signerAccountId,
            transactionList: params.transactionList
        }) ?? Promise.reject(new Error("DAppConnector not initialized"));
    }
  };

  const handleDisconnect = async () => {
    try {
        SessionPasswordManager.clearPassword();
        setIsConnecting(true);

        if (walletType === 'inApp') {
            // Clear in-app wallet state
            await inAppWallet.loadWallet("");  // TODO: Implement proper password handling for session restoration
            setAccount("");
            setUserId(null);
            setWalletType(null);
            setSessionState({
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
        } else {
            // Existing extension wallet disconnect flow
            if (dAppConnector && sessions?.length > 0) {
                await Promise.all(
                    sessions.map(async (session) => {
                        try {
                            await dAppConnector.disconnect(session.topic);
                        } catch (error: any) {
                            if (!error.message?.includes('Missing or invalid') && 
                                !error.message?.includes('already disconnected') &&
                                !error.message?.includes('Record was recently deleted')) {
                                console.error('[ERROR] Disconnect error:', error);
                            }
                        }
                    })
                );
            }

            setSessions([]);
            setAccount("");
            setUserId(null);
            setWalletType(null);
        }

        // Clear stored session for both wallet types
        await clearStoredSession();

    } catch (error) {
        console.error('[ERROR] Disconnect failed:', error);
        // Still attempt to clear local state even if disconnect fails
        setSessions([]);
        setAccount("");
        setUserId(null);
        setWalletType(null);
    } finally {
        setIsConnecting(false);
    }
  };

  const handleConnectInAppWallet = async (email: string, password: string) => {
    console.log('handleConnectInAppWallet called with:', { email });
    try {
        // Step 1: Register user first
        const response = await fetch('/api/auth/in-app-wallet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password,
            }),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to register user');
        }
        
        const data = await response.json();
        setUserId(data.userId);
        setError('Please check your email to verify your account');
        
        // Store password for session
        SessionPasswordManager.setPassword(password);
    } catch (error) {
        SessionPasswordManager.clearPassword();
        console.error('handleConnectInAppWallet error:', error);
        throw error;
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    try {
        setIsConnecting(true);
        SessionPasswordManager.setPassword(password);
        await inAppWallet.loadWallet(password);
        
        if (inAppWallet.inAppAccount) {
            const { data: { user } } = await supabase.auth.getUser();
            setAccount(inAppWallet.inAppAccount);
            setUserId(user?.id || null);
            setSessionState({
                wallet: {
                    isConnected: true,
                    accountId: inAppWallet.inAppAccount,
                    session: null
                },
                auth: {
                    isAuthenticated: true,
                    userId: user?.id || null,
                    session: null
                }
            });
        }
        setShowPasswordModal(false);
        setPendingSessionRestore(false);
    } catch (error) {
        console.error('Failed to restore session:', error);
        setError('Invalid password or session expired');
        SessionPasswordManager.clearPassword();
    } finally {
        setIsConnecting(false);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    setPendingSessionRestore(false);
    handleDisconnect();
  };

  // Update restoreInAppSession
  const restoreInAppSession = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user?.user_metadata?.isInAppWallet) {
                setWalletType('inApp');
                
                const sessionPassword = SessionPasswordManager.getPassword();
                if (!sessionPassword) {
                    setPendingSessionRestore(true);
                    setShowPasswordModal(true);
                    return;
                }
                
                await inAppWallet.loadWallet(sessionPassword);
                
                if (inAppWallet.inAppAccount) {
                    setAccount(inAppWallet.inAppAccount);
                    setUserId(user.id);
                    setSessionState({
                        wallet: {
                            isConnected: true,
                            accountId: inAppWallet.inAppAccount,
                            session: null
                        },
                        auth: {
                            isAuthenticated: true,
                            userId: user.id,
                            session: null
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Failed to restore session:', error);
        handleDisconnect();
    }
  };

  // Add session expiry listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (walletType === 'inApp') {
          if (!session) {
            // Session expired or user signed out
            handleDisconnect();
          } else {
            // Token was refreshed, update session state
            setSessionState(prev => ({
              ...prev,
              auth: {
                ...prev.auth,
                session
              }
            }));
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [walletType]);

  return (
    <WalletContext.Provider
      value={{
        account,
        activeAccount,
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
        setError,
        walletType,
        handleConnectInAppWallet,
        setIsConnecting,
      }}
    >
      {children}
      {showPasswordModal && (
        <SessionPasswordModal
          onSubmit={handlePasswordSubmit}
          onCancel={handlePasswordCancel}
        />
      )}
    </WalletContext.Provider>
  );
}

export const useWalletContext = () => {
  return useContext(WalletContext);
}