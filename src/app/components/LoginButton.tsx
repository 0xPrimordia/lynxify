"use client"
import React, { useState, useEffect } from "react";
import {usePrivy} from '@privy-io/react-auth';
import { useRouter } from "next/navigation";

export default function LoginButton() {
  const {ready, authenticated, login, logout} = usePrivy();
  const router = useRouter();
  // Disable login when Privy is not ready or the user is already authenticated
  const disableLogin = !ready || (ready && authenticated);

  useEffect(() => {
    if(ready && authenticated) {
        router.push('/dash')
    }
  })

  return (
    <>
        {!authenticated && (
            <button disabled={disableLogin} onClick={login}>
            Connect Ethereum
            </button>
        )}

        {authenticated && (
            <button onClick={logout}>
                Disconnect Ethereum
            </button>
        )}
    </>
  );
}