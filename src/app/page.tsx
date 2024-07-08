"use client"
import React, { useState } from "react";
import StakeTokens from './components/StakeTokens';
import { useWalletContext } from "./hooks/useWallet";

export default function Home() {
  const { pairingData } = useWalletContext();

  const stakeTokens = () => {
    // hedera contract for staking
  }

  return (
    <div className="mt-8 flex gap-8">
      {pairingData && (
        <>
          <StakeTokens stakeTokens={stakeTokens} />
        </>
      )}
    </div>    
  );
}
