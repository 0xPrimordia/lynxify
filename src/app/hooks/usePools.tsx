"use client";
import { useState, useEffect, createContext, ReactNode, useContext } from "react";
import { ApiLiquidityPoolV2 } from "../types";

const PoolContext = createContext<any>({});

interface Props {
    children: ReactNode
}

export const PoolProvider = ({children}:Props) => {
    const [pools, setPools] = useState<ApiLiquidityPoolV2[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPools = async () => {
            try {
                const response = await fetch("/api/saucerswap/pools")
                const data = await response.json();
                setPools(data);
            } catch (error:any) {
                setError(error.message);
            } 
        }
        fetchPools();
    }, [])
    
    return (
        <PoolContext.Provider value={{ pools, error }}>
            {children}
        </PoolContext.Provider>
    )
}

export function usePoolContext() {
    return useContext(PoolContext);
}