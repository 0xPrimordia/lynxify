"use client"
import { Client, PrivateKey, AccountCreateTransaction, AccountBalanceQuery, Hbar, TransferTransaction, AccountId, PublicKey, Key } from "@hashgraph/sdk"
import { useEffect, useState } from "react";
import walletConnectFcn from "./HederaWalletConnect";
import { BrowserProvider } from "ethers";
import {Card, CardHeader, CardBody, Button, Divider, Link, Image} from "@nextui-org/react";

export function HederaProvider({ children }: any) {
    const [newAccountId, setNewAccountId] = useState<AccountId|null>(null)
    const [newAccountBalance, setNewAccountBalance] = useState<number>(0)
    const [walletData, setWalletData] = useState<(string | BrowserProvider | undefined)[]>();
	const [account, setAccount] = useState<string | BrowserProvider>();
    const [connectTextSt, setConnectTextSt] = useState("");
    const [connectLinkSt, setConnectLinkSt] = useState("");
    const [network, setNetwork] = useState<string | BrowserProvider | undefined>();
    const [contractTextSt, setContractTextSt] = useState();
    const [privateKey, setPrivateKey] = useState<string>()
    const [publicKey, setPublicKey] = useState<any>()

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
    client.setMaxQueryPayment(new Hbar(50));

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
        console.log("connecting wallet...")
		if (account !== undefined) {
			setConnectTextSt(`🔌 Account ${account} already connected ⚡ ✅`);
		} else {
			const wData = await walletConnectFcn();

			let newAccount = wData[0];
			let newNetwork = wData[2];
			if (newAccount !== undefined) {
				setConnectTextSt(`🔌 Account ${newAccount} connected ⚡ ✅`);
				setConnectLinkSt(`https://hashscan.io/${newNetwork}/account/${newAccount}`);

				setWalletData(wData);
				setAccount(newAccount);
				setNetwork(newNetwork);
				//setContractTextSt();
			}
		}
	}

    useEffect(() => {
        console.log(newAccountId)
        setBalance()
    }, [newAccountId])

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
            <CardBody>
                
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
                </CardBody>
            </Card>
            
            
            {children}
        </div>
    )
}