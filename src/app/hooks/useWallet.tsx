"use client";
import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import { LedgerId } from '@hashgraph/sdk';
import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect';

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
    const [pairingData, setPairingData] = useState<SessionData | null>(null)
    const [connectionStatus, setConnectionStatus] = useState(
        HashConnectConnectionState.Disconnected
      );
    const [hashconnect, setHashconnect] = useState<HashConnect|null>(null);

    useEffect(() => {
        init()
    }, [])

    const init = async () => {
        const hashConnectInstance = new HashConnect(LedgerId.TESTNET, process.env.NEXT_PUBLIC_WALLETCONNECT_ID as string, appMetadata, true);

        hashConnectInstance.pairingEvent.on((newPairing) => {
            setPairingData(newPairing);
          })
        
          hashConnectInstance.disconnectionEvent.on((data) => {
            setPairingData(null);
          });
      
          hashConnectInstance.connectionStatusChangeEvent.on((connectionStatus) => {
            setConnectionStatus(connectionStatus);
          })
      
          await hashConnectInstance.init();
          setHashconnect(hashConnectInstance);
    }

    return ( 
        <WalletContext.Provider
        value={{
            pairingData,
            connectionStatus,
            hashconnect
        }}
      >
        {children}
      </WalletContext.Provider>
     );
}

export function useWalletContext() {
    return useContext(WalletContext);
}