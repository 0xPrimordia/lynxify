"use client";
import { ReactNode, createContext, useContext, useState, useEffect } from "react"
import { Token } from "@/app/types"

const SaucerSwapContext = createContext<any>({});

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