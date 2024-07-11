"use client";
import { ReactNode, createContext, useContext, useState, useEffect } from "react"

const SaucerSwapContext = createContext<any>({});

export type Token = {
    decimals: number;
    dueDiligenceComplete: boolean;
    icon: string;
    id: string;
    name: string;
    price: string;
    priceUsd: number;
    symbol: string;
    isFeeOnTransferToken: boolean;
}

interface Props {
    children: ReactNode
}

export const SaucerSwapProvider = ({children}:Props) => {
    const [tokens, setTokens] = useState<Token[]>()

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch("/api/saucerswap/tokens")
                if(response) {
                    const data = await response.json()
                    setTokens(data)
                    console.log(data)
                    //return data;
                }
            } catch (error) {
                console.error('Error fetching Supported Tokens:', error);
            }
        }
        fetchData()
    }, [])

    return(
        <SaucerSwapContext.Provider
        value={{
            tokens
        }}
      >
        {children}
      </SaucerSwapContext.Provider>
    )
}

export function useSaucerSwapContext() {
    return useContext(SaucerSwapContext);
}