"use client";
import { ReactNode, createContext, useContext, useState, useEffect } from "react";
//import { LedgerId } from '@hashgraph/sdk';
//import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect';
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
  ExtensionData,
  DAppSigner,
  SignAndExecuteTransactionParams,
  transactionToBase64String
} from '@hashgraph/hedera-wallet-connect';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';

const appMetadata = {
    name: "Lynxify",
    description: "<Your dapp description>",
    icons: ["<Image url>"],
    url: "<Dapp url>"
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

  /*  const [pairingData, setPairingData] = useState<SessionData | null>(null)
    const [connectionStatus, setConnectionStatus] = useState(
        HashConnectConnectionState.Disconnected
      );
    const [hashconnect, setHashconnect] = useState<HashConnect|null>(null);
    */

    useEffect(() => {
        init()
    }, [])

    useEffect(() => {
      if (session) {
        const sessionAccount = session.namespaces?.hedera?.accounts?.[0]
        if (sessionAccount) {
          const accountId = sessionAccount.split(':').pop()
          console.log(accountId)
          setAccount(accountId)
        }
      }
    }, [session])

    const init = async () => {
      console.log("Importing Hedera Wallet Connect module...");
      console.log("Configure DAppConnector...");

      const dAppConnector = new DAppConnector(
        appMetadata,
        // @ts-ignore
        "testnet",
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
      dAppConnector?.extensions?.forEach((extension: any) => {
        console.log('extension: ', extension)
      })

      const extensionData = dAppConnector.extensions?.filter(
        (extension: any) => extension.available,
      )
      if (extensionData) setExtensions(extensionData)

      console.log("Hedera Wallet Connect Initialized");

      setIsInitialized(true);
        /*const hashConnectInstance = new HashConnect(LedgerId.TESTNET, process.env.NEXT_PUBLIC_WALLETCONNECT_ID as string, appMetadata, true);

        hashConnectInstance.pairingEvent.on((newPairing) => {
            console.log("New pairing event", newPairing);
            setPairingData(newPairing);
          })
        
          hashConnectInstance.disconnectionEvent.on((data) => {
            console.log("Disconnection event", data);
            setPairingData(null);
          });
      
          hashConnectInstance.connectionStatusChangeEvent.on((connectionStatus) => {
            console.log("Connection status change event", connectionStatus);
            setConnectionStatus(connectionStatus);
          })
      
          await hashConnectInstance.init();
          setHashconnect(hashConnectInstance);
          console.log("Hashconnect instance", hashConnectInstance);
          */
    }

    const handleConnect = async (extensionId?: string) => {
      try {
        init()
        if (!dAppConnector) {
          console.log("Dapp Connector not initiated")
        }
        let session: SessionTypes.Struct
        if (extensionId) session = await dAppConnector!.connectExtension(extensionId)
        else session = await dAppConnector!.openModal()
  
        setSession(session)
  
        console.log('New connected session: ', session)
        // localStorage.setItem('session', JSON.stringify(session));
  
        console.log('New connected accounts: ', session.namespaces?.hedera?.accounts)
        const sessionAccount = session.namespaces?.hedera?.accounts?.[0]
        if (sessionAccount) {
          const accountId = sessionAccount.split(':').pop()
          console.log(accountId)
          setAccount(accountId)
        }
        const signer = dAppConnector!.signers[0]
        // localStorage.setItem('signer', JSON.stringify(signer) )
        console.log('Connected Wallet: ', signer)
  
      } finally {
        console.log("Connected")
      }
    }

    const handleDisconnectSessions = async () => {
      await dAppConnector!.disconnectAll()
      setSessions([])
      setSigners([])
      setAccount("")
    }

    return ( 
        <WalletContext.Provider
        value={{
            sessions,
            signers,
            account,
            extensions,
            dAppConnector,
            handleConnect,
            handleDisconnectSessions
        }}
      >
        {children}
      </WalletContext.Provider>
     );
}

export const useWalletContext = () => {
    return useContext(WalletContext);
}