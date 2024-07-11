"use client"
import React, { useState, useEffect } from "react";
import { Image, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@nextui-org/react";
import { useSaucerSwapContext, Token } from "../hooks/useTokens";
import useTokenPriceHistory from "../hooks/useTokenPriceHistory";
import TokenPriceChart from '../components/TokenPriceChart';
import { ChevronDownIcon } from "@heroicons/react/16/solid";

export default function DexPage() {
    const currentDate = new Date();
    const pastDate = new Date();
    pastDate.setDate(currentDate.getDate() - 1);
    const { tokens } = useSaucerSwapContext();
    const [from, setFrom] = useState(Math.floor(pastDate.getTime() / 1000));
    const [to, setTo] = useState(Math.floor(currentDate.getTime() / 1000));
    const [interval, setInterval] = useState('HOUR');
    const [currentToken, setCurrentToken] = useState<Token>(
        {
            decimals: 6,
            dueDiligenceComplete: true,
            icon: "/images/tokens/SD.png",
            id: "0.0.1463375",
            isFeeOnTransferToken: false,
            name: "Stader",
            price: "656407783",
            priceUsd: 0.43708297,
            symbol: "SD[hts]"
        }
    )
    const { data, loading, error } = useTokenPriceHistory(currentToken.id, from, to, interval);

    const selectToken = (tokenId:string) => {
        const token = tokens.find((token:Token) => token.id === tokenId);
        if (token) {
            setCurrentToken(token);
        }
    }

    return (    
        <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex pt-4">
            <div className="flex w-full">
                <div className="grow pr-12">
                    {data && <TokenPriceChart data={data} />}
                </div>
                <div className="flex relative h-14 pr-6">
                    {currentToken && currentToken.icon && (
                        <Image className="mt-1" width={40} alt="icon" src={`https://www.saucerswap.finance/${currentToken.icon}`} />
                    )}
                    <div className="px-3">
                        <h1 className="font-bold text-lg">{currentToken.symbol}</h1>
                        <p>{currentToken.name}</p>
                    </div>
                    <div className="pl-1">
                        <span className="text-xl text-green-500">${currentToken.priceUsd}</span>
                    </div>
                    <Dropdown placement="bottom-start">
                        <DropdownTrigger>
                            <div className="w-5 pt-1 pl-1">
                                <ChevronDownIcon />
                            </div>
                        </DropdownTrigger>
                        <DropdownMenu onAction={(key) => (selectToken(key as string) )} className="max-h-72 overflow-scroll w-full" aria-label="Token Selection" items={tokens} variant="flat">
                            {(token:Token) => (
                                <DropdownItem textValue={token.name} key={token.id} className="h-14 gap-2">
                                        <p>{token.name}</p>
                                </DropdownItem>
                            )}
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </div>
        </div>
    );
}
