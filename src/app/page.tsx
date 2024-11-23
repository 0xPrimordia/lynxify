"use client"
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWalletContext } from "./hooks/useWallet";
import { useNFTGate } from "./hooks/useNFTGate";
import LandingPage from "./components/LandingPage";

export default function Home() {
  const router = useRouter();
  const { account } = useWalletContext();
  const { hasAccess, isLoading } = useNFTGate(account);

  useEffect(() => {
    if (!account) return; // Don't redirect if not connected
    if (!isLoading && hasAccess) {
      router.push('/dex');
    }
  }, [hasAccess, isLoading, router, account]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <LandingPage />;
}
