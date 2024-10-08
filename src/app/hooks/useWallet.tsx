"use client";
import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
  ExtensionData,
  DAppSigner,
  SignAndExecuteTransactionParams,
  transactionToBase64String,
  SignMessageParams
} from '@hashgraph/hedera-wallet-connect';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { createClient } from '@supabase/supabase-js';

const appMetadata = {
    name: "Lynxify",
    description: "A Dex on Hedera for high volume trading",
    icons: ["<Image url>"],
    url: "http://localhost:3000"
}

const WalletContext = createContext<any>({});

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
    init()
  }, [])

  useEffect(() => {
    if (session) {
      const sessionAccount = session.namespaces?.hedera?.accounts?.[0]
      if (sessionAccount) {
        const accountId = sessionAccount.split(':').pop()
        setAccount(accountId)
      }
    }
  }, [session])

  const init = async () => {
    console.log("Initializing wallet and checking for existing session...");

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      console.log("Existing Supabase session found");
      setUserId(session.user.id);
      // Assuming the hederaAccountId is stored in user metadata
      const hederaAccountId = session.user.user_metadata?.hederaAccountId;
      if (hederaAccountId) {
        setAccount(hederaAccountId);
      }
    } else {
      console.log("No existing Supabase session");
    }

    console.log("Importing Hedera Wallet Connect module...");
    console.log("Configure DAppConnector...");

    const dAppConnector = new DAppConnector(
      appMetadata,
      // @ts-ignore
      "mainnet",
      process.env.NEXT_PUBLIC_WALLETCONNECT_ID,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [HederaChainId.Mainnet]
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

        // Always re-authenticate, even for existing sessions
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
          console.log('Data being sent to server:', dataToSend);

          console.log('Attempting to authenticate with server...');
          const response = await fetch('/api/auth/wallet-connect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('Authentication response:', JSON.stringify(data, null, 2));
            if (data.session && data.session.access_token) {
              const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
              );
              
              // Set the session in Supabase
              const { error } = await supabase.auth.setSession({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token
              });

              if (error) {
                console.error('Error setting Supabase session:', error);
                throw error;
              }

              // Now get the session to ensure it's set correctly
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                setUserId(session.user.id);
                setAccount(accountId);
              } else {
                throw new Error('Failed to retrieve session after setting');
              }
            } else {
              console.error('Session data not found in response');
              setError('Session data not found in response');
            }
          } else {
            const errorData = await response.json();
            console.error('Authentication failed:', errorData);
            throw new Error(errorData.error || 'Failed to authenticate user');
          }

        } catch (signError: any) {
          console.error('Error signing or authenticating:', signError);
          setError(signError.message || 'Failed to sign message or authenticate');
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
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();

      setSessions([]);
      setSigners([]);
      setAccount("");
      setUserId(null);
    } catch (error: any) {
      console.error('Error disconnecting sessions:', error);
      setError(error.message || 'Failed to disconnect sessions');
    }
  }

  return ( 
    <WalletContext.Provider
      value={{
        appMetadata,
        sessions,
        signers,
        account,
        extensions,
        dAppConnector,
        userId,
        handleConnect,
        handleDisconnectSessions,
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