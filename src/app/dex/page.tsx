"use client"
import React, { useState, useEffect } from "react";
import { Image } from "@nextui-org/react";
import { useSaucerSwapContext, Token } from "../hooks/useSaucerSwap";

export default function DexPage() {
    const { tokens } = useSaucerSwapContext();
    const [currentToken, setCurrentToken] = useState<Token>(
        {
            decimals: 6,
            dueDiligenceComplete: true,
            icon: "/images/tokens/xsauce.png",
            id: "0.0.1460200",
            isFeeOnTransferToken: false,
            name: "XSAUCE",
            price: "0",
            priceUsd: 0,
            symbol: "XSAUCE"
        }
    )

    return (    
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
            <h2>Dex</h2>
            <div>
                <div>
                    {currentToken && currentToken.icon && (
                        <Image alt="icon" src={`https://www.saucerswap.finance/${currentToken.icon}`} />
                    )}
                    <h1>{currentToken.symbol}</h1>
                    <p>{currentToken.name}</p>
                    
                </div>
            </div>
        </div>
    );
}
