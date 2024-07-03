"use client"
import React, { useEffect, useState } from "react";
import { Client, Hbar, LedgerId } from '@hashgraph/sdk';
import { VT323 } from "next/font/google";
import { Button, NextUIProvider, Navbar, NavbarContent, NavbarItem, NavbarBrand, Card, CardHeader, Image } from "@nextui-org/react";
import { HashConnect, HashConnectConnectionState, SessionData } from 'hashconnect';
import StakeTokens from './components/StakeTokens';

const vt323 = VT323({ weight: "400", subsets: ["latin"] })

const appMetadata = {
  name: "Lynxify",
  description: "<Your dapp description>",
  icons: ["<Image url>"],
  url: "<Dapp url>"
}

export default function Home() {
  const myAccountId = process.env.NEXT_PUBLIC_MY_ACCOUNT_ID;
  const myPrivateKey = process.env.NEXT_PUBLIC_MY_PRIVATE_KEY;
  const [hashPairingData, setHashPairingData] = useState<SessionData | null>(null)
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    HashConnectConnectionState.Disconnected
  );
  const [hashconnect, setHashconnect] = useState<HashConnect|null>(null);

  if (!myAccountId || !myPrivateKey) {
    throw new Error("Environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present");
  }

  useEffect(() => {
    initWallet()
  }, [])

  const initWallet = async () => {
    const hashConnectInstance = new HashConnect(LedgerId.TESTNET, process.env.NEXT_PUBLIC_WALLETCONNECT_ID as string, appMetadata, true);
    hashConnectInstance.pairingEvent.on((newPairing) => {
      setHashPairingData(newPairing);
    })
  
    hashConnectInstance.disconnectionEvent.on((data) => {
      setHashPairingData(null);
    });

    hashConnectInstance.connectionStatusChangeEvent.on((connectionStatus) => {
      setConnectionStatus(connectionStatus);
    })

    await hashConnectInstance.init();
    setHashconnect(hashConnectInstance);
  }

  const disconnect = () => {
    if(!hashconnect) return
    hashconnect.disconnect();
  };

  const connect = async () => {
    if(!hashconnect) return
    await hashconnect.openPairingModal();
  };

  const stakeTokens = () => {
    // hedera contract for staking

  }

  return (
    <NextUIProvider>
      <main className="flex min-h-screen flex-col items-center p-4">
        <Navbar>
          <NavbarBrand>
            <span className="box"><h1 style={{fontSize: "2.5rem", color: "#4E94FE"}} className={vt323.className+" font-bold"}>Lynxify</h1></span>
          </NavbarBrand>
          <NavbarContent justify="end">
            <NavbarItem className="hidden lg:flex">
              {hashPairingData ? (
                <>
                  <p className="text-sm mt-4">{hashPairingData?.accountIds[0]} <img style={{width:"30px", display:"inline-block", marginTop: "-3px"}} src="/images/hedera-hbar-logo.png" /></p>
                </>
                ):(
                  <p><Button className="mt-4" onClick={connect}>Connect Wallet</Button></p>
                )}
            </NavbarItem>
          </NavbarContent>
        </Navbar>
        <div className="mt-8 flex gap-8">
          {hashPairingData && (
            <>
              <StakeTokens stakeTokens={stakeTokens} />
            </>
          )}
        </div>    
    </main>
    </NextUIProvider>
  );
}
