"use client"
import { Client, PrivateKey, AccountCreateTransaction, AccountBalanceQuery, Hbar, LedgerId, TransferTransaction, AccountId, PublicKey, Key } from "@hashgraph/sdk"
import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import {Card, CardHeader, CardBody, Button, Divider, Link, Image} from "@nextui-org/react";
import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect';

const appMetadata = {
    name: "Lynxify",
    description: "<Your dapp description>",
    icons: ["<Image url>"],
    url: "<Dapp url>"
}

interface HederaContextType {
    client: Client;
}

interface HederaProviderProps {
    children: ReactNode;
}

const HederaContext = createContext<HederaContextType | undefined>(undefined);

export const useHederaClient = (): HederaContextType => {
    const context = useContext(HederaContext);
    if (!context) {
      throw new Error("useHederaClient must be used within a HederaProvider");
    }
    return context;
};

export function HederaProvider({ children }: HederaProviderProps) {
    const ledgerId = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;
    const hashConnectInstance = new HashConnect(ledgerId, process.env.NEXT_PUBLIC_WALLETCONNECT_ID as string, appMetadata, true);
    const [isConnected, setIsConnected] = useState(false);
    const [hashPairingData, setHashPairingData] = useState<SessionData | null>(null)
    let state: HashConnectConnectionState = HashConnectConnectionState.Disconnected;

    //Create your Hedera client without an operator
    const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

    async function connectWallet() {
        if(hashConnectInstance && hashConnectInstance.connectedAccountIds.length > 0) {
            const accountIdToPair = hashConnectInstance.connectedAccountIds[0];
        } else {
            setUpHashConnectEvents();

            //initialize
            await hashConnectInstance.init();
            
            //open pairing modal
            if(!hashConnectInstance) return
            
            await hashConnectInstance.openPairingModal();
        }
    }

    function setUpHashConnectEvents() {
        if(!hashConnectInstance) return
        hashConnectInstance.pairingEvent.on((newPairing) => {
            setHashPairingData(newPairing);
        })
        
        hashConnectInstance.disconnectionEvent.on((data) => {
            setHashPairingData(null);
        });
    
        hashConnectInstance.connectionStatusChangeEvent.on((connectionStatus) => {
            state = connectionStatus;
            if(connectionStatus === HashConnectConnectionState.Connected) {
                setIsConnected(true)
            }
        })
    }
    
    return (
        <div>
            <Card className="max-w-[400px]" style={{marginBottom: "2rem"}}>
                <CardHeader className="flex gap-3">
                    <Image
                        alt="Port to Hedera"
                        height={40}
                        radius="sm"
                        src="/images/hedera-hbar-logo.png"
                        width={40}
                    />
                    <div className="flex flex-col">
                        <p className="text-md">Manage Hedera Account</p>
                        <p className="text-small text-default-500">Connect Wallet</p>
                    </div>
                </CardHeader>
                <Divider/>
                <CardBody className="text-center p-10">
                    {isConnected && hashPairingData?.accountIds ? (
                        <p>Connected to: {hashPairingData?.accountIds[0]}</p>
                    ):(
                        <p><Button onPress={connectWallet}>Connect Wallet</Button></p>
                    )}
                </CardBody>
            </Card>
            
            <HederaContext.Provider value={{client}}>
                {children}
            </HederaContext.Provider>
        </div>
    )
}

