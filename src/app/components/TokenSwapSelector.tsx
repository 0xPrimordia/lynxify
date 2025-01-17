import React from 'react';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Image } from "@nextui-org/react";
import { ArrowsUpDownIcon } from "@heroicons/react/16/solid";
import { Token } from "../hooks/useTokens";
import { WHBAR_ID } from "../lib/constants";
import { Pool } from "../types";

interface TokenSwapSelectorProps {
    tokens: Token[];
    pools: any[];
    tokenA: Token;
    tokenB: Token | null;
    onTokenAChange: (token: Token) => void;
    onTokenBChange: (token: Token) => void;
    onPoolChange: (pool: any) => void;
}

export const TokenSwapSelector: React.FC<TokenSwapSelectorProps> = ({
    tokens,
    pools,
    tokenA,
    tokenB,
    onTokenAChange,
    onTokenBChange,
    onPoolChange,
}) => {
    const findBestPool = (fromToken: Token, toToken: Token): Pool | null => {
        console.log('Finding pool for:', {
            from: fromToken.symbol,
            fromId: fromToken.id,
            to: toToken.symbol,
            toId: toToken.id
        });

        // Direct pool check
        const directPool = pools.find(p => 
            (p.tokenA.id === fromToken.id && p.tokenB.id === toToken.id) ||
            (p.tokenA.id === toToken.id && p.tokenB.id === fromToken.id)
        );

        if (directPool) {
            console.log('Direct pool found:', directPool);
            return directPool;
        }

        // If one token is HBAR, find its WHBAR pool
        if (fromToken.id === WHBAR_ID) {
            const whbarPool = pools.find(p =>
                (p.tokenA.id === WHBAR_ID && p.tokenB.id === toToken.id) ||
                (p.tokenB.id === WHBAR_ID && p.tokenA.id === toToken.id)
            );
            if (whbarPool) {
                console.log('Found WHBAR pool for target token:', whbarPool);
                return whbarPool;
            }
        }

        if (toToken.id === WHBAR_ID) {
            const whbarPool = pools.find(p =>
                (p.tokenA.id === WHBAR_ID && p.tokenB.id === fromToken.id) ||
                (p.tokenB.id === WHBAR_ID && p.tokenA.id === fromToken.id)
            );
            if (whbarPool) {
                console.log('Found WHBAR pool for source token:', whbarPool);
                return whbarPool;
            }
        }

        // For token-to-token swaps, let the trade execution handle routing
        console.log('No direct pool found - routing will be handled by trade execution');
        return null;
    };

    const handleTokenSelect = (token: Token, isTokenA: boolean) => {
        if (isTokenA) {
            onTokenAChange(token);
            if (tokenB) {
                const bestPool = findBestPool(token, tokenB);
                onPoolChange(bestPool);
            }
        } else {
            onTokenBChange(token);
            const bestPool = findBestPool(tokenA, token);
            onPoolChange(bestPool);
        }
    };

    const handleSwapDirection = () => {
        if (!tokenB) return;
        const newTokenA = tokenB;
        const newTokenB = tokenA;
        onTokenAChange(newTokenA);
        onTokenBChange(newTokenB);
        const bestPool = findBestPool(newTokenA, newTokenB);
        if (bestPool) onPoolChange(bestPool);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                {/* Token A Selector */}
                <div className="flex-1">
                    <Dropdown>
                        <DropdownTrigger>
                            <Button 
                                className="w-full justify-between"
                                variant="bordered"
                            >
                                <div className="flex items-center gap-2">
                                    <Image 
                                        src={`https://www.saucerswap.finance/${tokenA.icon}`}
                                        alt={tokenA.symbol}
                                        width={24}
                                        height={24}
                                    />
                                    <span>{tokenA.symbol}</span>
                                </div>
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu 
                            items={tokens}
                            onAction={(key) => {
                                const token = tokens.find(t => t.id === key);
                                if (token) handleTokenSelect(token, true);
                            }}
                        >
                            {(token) => (
                                <DropdownItem key={token.id}>
                                    <div className="flex items-center gap-2">
                                        <Image 
                                            src={`https://www.saucerswap.finance/${token.icon}`}
                                            alt={token.symbol}
                                            width={24}
                                            height={24}
                                        />
                                        <span>{token.symbol}</span>
                                    </div>
                                </DropdownItem>
                            )}
                        </DropdownMenu>
                    </Dropdown>
                </div>

                {/* Swap Direction Button */}
                <Button
                    isIconOnly
                    variant="light"
                    onPress={handleSwapDirection}
                    isDisabled={!tokenB}
                >
                    <ArrowsUpDownIcon className="h-4 w-4" />
                </Button>

                {/* Token B Selector */}
                <div className="flex-1">
                    <Dropdown>
                        <DropdownTrigger>
                            <Button 
                                className="w-full justify-between"
                                variant="bordered"
                            >
                                {tokenB ? (
                                    <div className="flex items-center gap-2">
                                        <Image 
                                            src={`https://www.saucerswap.finance/${tokenB.icon}`}
                                            alt={tokenB.symbol}
                                            width={24}
                                            height={24}
                                        />
                                        <span>{tokenB.symbol}</span>
                                    </div>
                                ) : (
                                    <span>Select Token</span>
                                )}
                            </Button>
                        </DropdownTrigger>
                        <DropdownMenu 
                            items={tokens}
                            onAction={(key) => {
                                const token = tokens.find(t => t.id === key);
                                if (token) handleTokenSelect(token, false);
                            }}
                        >
                            {(token) => (
                                <DropdownItem key={token.id}>
                                    <div className="flex items-center gap-2">
                                        <Image 
                                            src={`https://www.saucerswap.finance/${token.icon}`}
                                            alt={token.symbol}
                                            width={24}
                                            height={24}
                                        />
                                        <span>{token.symbol}</span>
                                    </div>
                                </DropdownItem>
                            )}
                        </DropdownMenu>
                    </Dropdown>
                </div>
            </div>

            {/* Pool Information (if needed) */}
            {tokenB && (
                <div className="text-sm text-gray-500">
                    {findBestPool(tokenA, tokenB) ? 
                        `Via: ${tokenA.symbol}/${tokenB.symbol} Pool` : 
                        `Via: ${tokenA.symbol}/WHBAR → WHBAR/${tokenB.symbol}`
                    }
                </div>
            )}
        </div>
    );
}; 