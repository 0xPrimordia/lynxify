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
    const hashConnectInstance = new HashConnect(LedgerId.TESTNET, process.env.NEXT_PUBLIC_WALLETCONNECT_ID as string, appMetadata, true);
    const [newAccountId, setNewAccountId] = useState<AccountId|null>(null)
    const [newAccountBalance, setNewAccountBalance] = useState<number>(0)
    const [privateKey, setPrivateKey] = useState<string>()
    const [isConnected, setIsConnected] = useState(false);
    const [hashPairingData, setHashPairingData] = useState<SessionData | null>(null)
    let state: HashConnectConnectionState = HashConnectConnectionState.Disconnected;

    //Grab your Hedera testnet account ID and private key from your .env file
    const myAccountId = process.env.NEXT_PUBLIC_MY_ACCOUNT_ID;
    const myPrivateKey = process.env.NEXT_PUBLIC_MY_PRIVATE_KEY;

    // If we weren't able to grab it, we should throw a new error
    if (!myAccountId || !myPrivateKey) {
        throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
    }

    //Create your Hedera Testnet client
    const client = Client.forTestnet();

    //Set your account as the client's operator
    client.setOperator(myAccountId, myPrivateKey);

    //Set the default maximum transaction fee (in Hbar)
    client.setDefaultMaxTransactionFee(new Hbar(100));

    //Set the maximum payment for queries (in Hbar)
    client.setDefaultMaxQueryPayment(new Hbar(50));

    //Create a new account with 1,000 tinybar starting balance
    const createAccount = async () => {
        const newAccountPrivateKey = PrivateKey.generateED25519();
        const newAccountPublicKey = newAccountPrivateKey?.publicKey;

        if(!newAccountPublicKey) return
        const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(Hbar.fromTinybars(1000))
        .execute(client);
        
        // Get the new account ID
        const getReceipt = await newAccount.getReceipt(client);
        setNewAccountId(getReceipt.accountId);
        setPrivateKey(newAccountPrivateKey.toString())

        console.log(newAccountPublicKey)
    }

    const setBalance = async () => {
        //Verify the account balance
        if(!newAccountId) return
        const accountBalance = await new AccountBalanceQuery()
        .setAccountId(newAccountId)
        .execute(client);
        const balance = accountBalance.hbars.toTinybars()
        setNewAccountBalance(balance.low)
        console.log('test')
        console.log('balance '+balance.low)
    }

    async function connectWallet() {
        if(hashConnectInstance && hashConnectInstance.connectedAccountIds.length > 0) {
            const accountIdToPair = hashConnectInstance.connectedAccountIds[0];
        } else {
            setUpHashConnectEvents();
              

            //initialize
            await hashConnectInstance.init();

            //localStorage.setItem('hashconnectData', JSON.stringify({ initData }));
            

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

    useEffect(() => {
        console.log(newAccountId)
        setBalance()
    }, [newAccountId, setBalance])

    useEffect(() => {
        console.log(newAccountBalance)
    }, [newAccountBalance])
    
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
                <p className="text-small text-default-500">Connect or Create Account</p>
                </div>
            </CardHeader>
            <Divider/>
            <CardBody className="text-center p-10">
                
                {!newAccountId?.num.low ? (
                    <p><Button onClick={createAccount}>Create Account</Button></p>
                ):(
                    <p>{newAccountBalance} tinybar</p>
                )}
                {privateKey && (
                    <div style={{marginTop: "1rem"}}>
                        <label>Private Key: </label>  
                        <input value={privateKey}></input>
                    </div>
                )}
                <p className="my-2 font-bold">or</p>
                {isConnected && hashPairingData?.accountIds ? (
                    <p>Connected to: {hashPairingData?.accountIds[0]}</p>
                ):(
                    <p><Button onClick={connectWallet}>Connect Wallet</Button></p>
                )}
                
                </CardBody>
            </Card>
            
            <HederaContext.Provider value={{client}}>
                {children}
            </HederaContext.Provider>
            
        </div>
    )
}

