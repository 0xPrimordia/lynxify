"use client";
import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { Client } from "@hashgraph/sdk";
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
  ExtensionData,
  DAppSigner,
} from '@hashgraph/hedera-wallet-connect';
import { SessionTypes } from '@walletconnect/types';
import { supabase } from '@/utils/supabase/client';

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
    appMetadata: any;
    sessions?: SessionTypes.Struct[];
    signers: DAppSigner[];
    extensions: ExtensionData[];
    dAppConnector: DAppConnector | null;
    userId: string | null;
    isConnecting: boolean;
    error: string | null;
}

export const WalletContext = createContext<WalletContextType>({
    account: "",
    handleConnect: async () => {},
    handleDisconnectSessions: async () => {},
    signAndExecuteTransaction: async () => {},
    client: Client.forTestnet(),
    appMetadata: {},
    sessions: [],
    signers: [],
    extensions: [],
    dAppConnector: null,
    userId: null,
    isConnecting: false,
    error: null
});

interface useWalletProps {
    children: ReactNode
}

export const WalletProvider = ({children}:useWalletProps) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [sessions, setSessions] = useState<SessionTypes.Struct[]>()
  const [session, setSession] = useState<SessionTypes.Struct>()
  const [signers, setSigners] = useState<DAppSigner[]>([])
  const [account, setAccount] = useState<any>("")
  const [extensions, setExtensions] = useState<ExtensionData[]>([])
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null)
  const [userId, setUserId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init();

    // Add auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', { event, userId: session?.user?.id });
      if (session?.user?.id) {
        console.log('Setting userId from auth change:', session.user.id);
        setUserId(session.user.id);
        const hederaAccountId = session.user.user_metadata?.hederaAccountId;
        if (hederaAccountId) {
          setAccount(hederaAccountId);
        }
      } else {
        console.log('Clearing userId due to auth change');
        setUserId(null);
        setAccount("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const init = async () => {
    console.log("Initializing wallet and checking for existing session...");

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Initial session check:', { session, error: sessionError });

    if (session?.user?.id) {
      console.log("Existing Supabase session found:", session.user.id);
      setUserId(session.user.id);
      const hederaAccountId = session.user.user_metadata?.hederaAccountId;
      if (hederaAccountId) {
        setAccount(hederaAccountId);
      }
    } else {
      console.log("No existing Supabase session or missing user ID");
    }

    console.log("Importing Hedera Wallet Connect module...");
    console.log("Configure DAppConnector...");

    const dAppConnector = new DAppConnector(
      appMetadata,
      // @ts-ignore
      "testnet",
      process.env.NEXT_PUBLIC_WALLETCONNECT_ID,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [HederaChainId.Testnet]
    );

    console.log("Initialize Hedera Wallet Connect...");

    await dAppConnector.init({ logger: "error" });
    console.log(dAppConnector)
    setDAppConnector(dAppConnector)
    setSigners(dAppConnector.signers)
    const _sessions = dAppConnector.walletConnectClient?.session.getAll()
    if (_sessions && _sessions?.length > 0) {
      console.log(_sessions)
      setSessions(_sessions)
      setSession(_sessions[0])
    }

    const extensionData = dAppConnector.extensions?.filter(
      (extension: any) => extension.available,
    )
    if (extensionData) setExtensions(extensionData)

    console.log("Hedera Wallet Connect Initialized");

    setIsInitialized(true);
  }

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
      
      let session: SessionTypes.Struct;
      if (extensionId) {
        session = await dAppConnector.connectExtension(extensionId);
      } else {
        // Check if there's an existing session
        const existingSessions = dAppConnector.walletConnectClient?.session.getAll();
        if (existingSessions && existingSessions.length > 0) {
          session = existingSessions[0];
        } else {
          session = await dAppConnector.openModal();
        }
      }

      console.log('Connected session: ', session);

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

            if (authData.session?.user?.id) {
              console.log('Setting userId from auth response:', authData.session.user.id);
              setUserId(authData.session.user.id);
              
              // Verify the session was properly set
              const { data: { session: verifySession } } = await supabase.auth.getSession();
              console.log('Verified session after auth:', verifySession);
              
              if (!verifySession?.user?.id) {
                console.warn('Session not properly set, attempting to set manually');
                await supabase.auth.setSession({
                  access_token: authData.session.access_token,
                  refresh_token: authData.session.refresh_token
                });
              }
            } else {
              console.error('No user ID in auth response:', authData);
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
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }

  const handleDisconnectSessions = async () => {
    try {
      await dAppConnector?.disconnectAll();
      await supabase.auth.signOut();
      setSessions([]);
      setSigners([]);
      setAccount("");
      setUserId(null);
      localStorage.removeItem('authToken');
    } catch (error: any) {
      console.error('Error disconnecting sessions:', error);
      setError(error.message || 'Failed to disconnect sessions');
    }
  }

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
        error
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWalletContext = () => {
  return useContext(WalletContext);
}