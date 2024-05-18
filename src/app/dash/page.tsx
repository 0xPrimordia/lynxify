"use client"
import React, { useState, useEffect } from "react";
//import { createHashPackSigner, useHashConnect, HashportClientProviderWithRainbowKit } from "@hashport/react-client";
//import "../utils/polyfills"
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from '@privy-io/react-auth';
import { useRouter } from "next/navigation";
import LoginButton from "../components/LoginButton";

export default function Home() {
    const { ready, authenticated } = usePrivy();
    const { wallets} = useWallets();
    //@ts-ignore
    //const { hashConnect, pairingData } = useHashConnect({ mode: 'testnet' });
    //const hederaSigner = pairingData && createHashPackSigner(hashConnect, pairingData);
    
    const router = useRouter();
    const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy');

    if (!ready) return null;
    if (ready && !authenticated) {
        router.push("/");
    }

    return (
        
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
            <h2>Dashboard</h2>
            <p>Privy Wallet: {embeddedWallet?.address}</p>
            <LoginButton />
        </div>
        
        </main>

    );
}
