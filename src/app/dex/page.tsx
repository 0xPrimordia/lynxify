"use client"
import React, { useState, useEffect, useRef } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tabs, Tab, Image, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input, Chip, Switch, Select, SelectItem } from "@nextui-org/react";
import { useSaucerSwapContext, Token } from "../hooks/useTokens";
import useTokenPriceHistory from "../hooks/useTokenPriceHistory";
import dynamic from 'next/dynamic'
import { useRouter } from "next/navigation";
import { useWalletContext } from "../hooks/useWallet";
import { useNFTGate } from "../hooks/useNFTGate";
import { SignAndExecuteTransactionParams, SignAndExecuteTransactionResult } from '@hashgraph/hedera-wallet-connect';
import { Threshold } from "../types";
import { ArrowRightIcon } from "@heroicons/react/16/solid";

// Dynamically import components that use window
const TokenPriceChart = dynamic(
    () => import('../components/TokenPriceChart'),
    { ssr: false }
);

const ApexChart = dynamic(
    () => import('../components/ApexChart'),
    { ssr: false }
);

import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { ArrowsRightLeftIcon } from "@heroicons/react/16/solid";
import { Menubar, MenubarMenu } from '@/components/ui/menubar';
import { Button, ButtonGroup } from '@nextui-org/react';
import { swapExactTokenForToken } from "../lib/saucerswap";
import { usePoolContext } from "../hooks/usePools";
  
export default function DexPage() {
    const router = useRouter();
    const { account, userId, dAppConnector } = useWalletContext();
    const { hasAccess, isLoading: nftGateLoading } = useNFTGate(account);
    const currentDate = new Date();
    const pastDate = new Date();
    pastDate.setDate(currentDate.getDate() - 7);
    const { tokens } = useSaucerSwapContext();
    const { pools } = usePoolContext();
    const [selectedSection, setSelectedSection] = useState("chart")
    const [currentPools, setCurrentPools] = useState<any[]>([]);
    const [from, setFrom] = useState(Math.floor(pastDate.getTime() / 1000));
    const [to, setTo] = useState(Math.floor(currentDate.getTime() / 1000));
    const [interval, setInterval] = useState('HOUR');
    const [tradeToken, setTradeToken] = useState<Token|null>(null);
    const [tradeAmount, setTradeAmount] = useState("0.0");
    const [tradePrice, setTradePrice] = useState(0);
    const [stopLoss, setStopLoss] = useState(false);
    const [buyOrder, setBuyOrder] = useState(false);
    const [stopLossPrice, setStopLossPrice] = useState<number>(0);
    const [buyOrderPrice, setBuyOrderPrice] = useState<number>(0);
    const [stopLossCap, setStopLossCap] = useState<number>(0);
    const [buyOrderCap, setBuyOrderCap] = useState<number>(0);
    const [thresholds, setThresholds] = useState<Threshold[]>([]);
    const [currentPool, setCurrentPool] = useState<any>(null);
    const [currentToken, setCurrentToken] = useState<Token>(
        {
            decimals: 8,
            dueDiligenceComplete: true,
            icon: "/images/tokens/WHBAR.png",
            id: "0.0.15058",
            isFeeOnTransferToken: false,
            name: "WHBAR (new)",
            price: "0",
            priceUsd: 0,
            symbol: "HBAR"
        }
    )
    const { data, loading, error } = useTokenPriceHistory(currentToken.id, from, to, interval);
    const prevPoolsRef = useRef<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isLoading || nftGateLoading) return; // Don't redirect while loading
        if (!account || !hasAccess) {
            router.push('/');
        }
    }, [account, hasAccess, isLoading, nftGateLoading, router]);

    useEffect(() => {
        if(!pools || !currentToken) return;
        const pairs = pools.filter((pool:any) => pool.tokenA.id === currentToken.id || pool.tokenB.id === currentToken.id);
        if (JSON.stringify(pairs) !== JSON.stringify(prevPoolsRef.current)) {
            setCurrentPools(pairs);
            prevPoolsRef.current = pairs;
        }
    }, [pools, currentToken]);

    useEffect(() => {
        const fetchThresholds = async () => {
            if (!userId) {
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const response = await fetch(`/api/thresholds?userId=${userId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setThresholds(Array.isArray(data) ? data : [data]);
                console.log("Thresholds", data);
            } catch (error) {
                console.error('Error fetching thresholds:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchThresholds();
    }, [userId]);

    useEffect(() => {
        if (!tokens || !tokens.length) return;
        
        // Find WHBAR token from the loaded tokens using correct ID
        const whbarToken = tokens.find((token: Token) => token.id === "0.0.15058");
        if (whbarToken) {
            setCurrentToken(whbarToken);
        }
    }, [tokens]); // Only run when tokens are loaded/updated

    const handleQuote = async () => {
        try {
            console.log('Initiating trade')
            if (!dAppConnector || !tradeToken || !currentToken) {
                console.error('Missing required dependencies');
                return;
            }

            const deadline = Math.floor(Date.now() / 1000) + 30 * 60;
            const result = await swapExactTokenForToken(
                tradeAmount.toString(), 
                currentToken.id,
                tradeToken.id,
                3000,
                account!,
                deadline,
                0
            );

            if (!result) {
                console.error('No transaction result');
                return;
            }

            const swapParams: SignAndExecuteTransactionParams = {
                transactionList: result,
                signerAccountId: `hedera:testnet:${account}`,
            }

            const swapResults = await dAppConnector.signAndExecuteTransaction(swapParams);
            console.log('Transaction results:', swapResults);
        } catch (error) {
            console.error('Error swapping tokens', error);
        }
    };

    const setDateInterval = (interval: string) => {
        if (interval === "WEEK") {
            pastDate.setDate(currentDate.getDate() - 7);
            setInterval('WEEK');
        }
        if (interval === "DAY") {
            pastDate.setDate(currentDate.getDate() - 1);
            setInterval('DAY');
        }
        if (interval === "HOUR") {
            pastDate.setDate(currentDate.getDate() - 1);
            setInterval('HOUR');
        }
    }

    const selectCurrentToken = async (tokenId:string) => {
        const token = tokens.find((token:Token) => token.id === tokenId);
        if (token) {
            setCurrentToken(token);
            setCurrentPool(null);
            console.log("Current token", token);
        }
    }

    const selectTradeToken = (tokenId: string) => {
        const token = tokens.find((token:Token) => token.id === tokenId);
        if (token) {
            setTradeToken(token);
            setTradePrice(token.price);
            //handleCurrentPool();
        }
    }

    const saveThresholds = async () => {
        const response = await fetch('/api/thresholds/setThresholds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                stopLoss: stopLossPrice, 
                buyOrder: buyOrderPrice,
                stopLossCap: stopLossCap,
                buyOrderCap: buyOrderCap,
                hederaAccountId: account,
                tokenA: currentPool.tokenA.id,
                tokenB: currentPool.tokenB.id,
                fee: currentPool.fee,
                userId: userId
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to set thresholds');
        }
        const data = await response.json();
        console.log(data.message);
    }

    const handleCurrentPool = (poolId: string | Set<string>) => {
        
        // Check if poolId is a Set (which is what NextUI's Select component returns)
        if (poolId instanceof Set) {
            poolId = Array.from(poolId)[0]; // Get the first (and only) item from the Set
        }

        // Ensure poolId is a string before parsing
        if (typeof poolId === 'string') {
            let poolIdNum = parseInt(poolId);
            const pool = currentPools.find((pool:any) => pool.id === poolIdNum);

            if (pool) {
                setCurrentPool(pool);
                setTradeToken(pool.tokenA.id === currentToken.id ? pool.tokenB : pool.tokenA);
            }
        } else {
            console.error('Invalid pool ID type:', typeof poolId);
        }
    }

    const deleteThreshold = async (id: number) => {
        // TODO: Implement delete threshold API method
        const response = await fetch(`/api/thresholds/deleteThreshold?id=${id}`);
        if (!response.ok) {
            throw new Error('Failed to delete threshold');
        }
        const data = await response.json();
        console.log(data.message);
    }

    const getTokenBalance = async (tokenId: string) => {
        if (!account) return 0;
        
        try {
            // Special case for WHBAR - check native HBAR balance instead
            if (tokenId === "0.0.15058") {
                const response = await fetch(`https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/accounts/${account}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch HBAR balance');
                }
                const data = await response.json();
                // Convert from tinybars (10^8) to HBAR
                return data.balance.balance;
            }

            // Regular token balance check
            const response = await fetch(`/api/tokens/balance?accountId=${account}&tokenId=${tokenId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch token balance');
            }
            const data = await response.json();
            return data.balance;
        } catch (error) {
            console.error('Error fetching token balance:', error);
            return 0;
        }
    };

    const handleMaxClick = async () => {
        if (!currentToken) return;
        
        const balance = await getTokenBalance(currentToken.id);
        // Convert from smallest unit to decimal representation based on token decimals
        const formattedBalance = (Number(balance) / Math.pow(10, currentToken.decimals)).toString();
        setTradeAmount(formattedBalance);
    };

    useEffect(() => {
        console.log("Current pool listener:", currentPool)
    }, [currentPool]);

    if (isLoading || nftGateLoading) {
        return <div>Loading...</div>;
    }

    return (    
        <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex pt-4">
            <div className="flex w-full">
                <div className="grow pr-8">
                    <Tabs 
                        aria-label="section" 
                        selectedKey={selectedSection} 
                        onSelectionChange={(key) => setSelectedSection(key.toString())}
                    >
                        <Tab key="chart" title='Price Chart'>
                            <Menubar style={{borderColor: '#333', marginBottom: '2rem'}}>
                                <MenubarMenu>
                                    <ButtonGroup>
                                        <Button onClick={() => setDateInterval('WEEK')} className={interval === "WEEK" ? 'bg-gray-800' : ''} disabled={interval === "WEEK" ? true : false} variant="light" size="sm">Week</Button>
                                        <Button onClick={() => setDateInterval('DAY')} className={interval === "DAY" ? 'bg-gray-800' : ''} disabled={interval === "DAY" ? true : false} variant="light" size="sm">Day</Button>
                                        <Button onClick={() => setDateInterval('HOUR')} className={interval === "HOUR" ? 'bg-gray-800' : ''} disabled={interval === "HOUR" ? true : false} variant="light" size="sm">Hour</Button>
                                    </ButtonGroup>
                                </MenubarMenu>
                            </Menubar>
                            {loading ? (
                                <div>Loading chart data...</div>
                            ) : error ? (
                                <div>Error loading chart data</div>
                            ) : data && data.length > 0 ? (
                                <ApexChart data={data} />
                            ) : (
                                <div>No price data available</div>
                            )}
                        </Tab>
                        <Tab key="thresholds" title='Thresholds'>
                            <Table>
                                <TableHeader>
                                    <TableColumn>Token A</TableColumn>
                                    <TableColumn>Token B</TableColumn>
                                    <TableColumn>Fee</TableColumn>
                                    <TableColumn>Stop Loss</TableColumn>
                                    <TableColumn>Stop Loss Cap</TableColumn>
                                    <TableColumn>Buy Order</TableColumn>
                                    <TableColumn>Buy Order Cap</TableColumn>
                                    <TableColumn>Delete</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {thresholds.length > 0 ? (
                                        thresholds.map((threshold: Threshold) => (
                                            <TableRow key={threshold.id}>
                                                <TableCell>
                                                {threshold.tokenA}
                                                </TableCell>
                                                <TableCell>
                                                {threshold.tokenB}
                                                </TableCell>
                                                <TableCell>
                                                {threshold.fee}
                                                </TableCell>
                                                <TableCell>${threshold.stopLoss}</TableCell>
                                                <TableCell>{threshold.stopLossCap}</TableCell>
                                                <TableCell>${threshold.buyOrder}</TableCell>
                                                <TableCell>{threshold.buyOrderCap}</TableCell>
                                                <TableCell>
                                                    <Button onClick={() => deleteThreshold(threshold.id)}>Delete</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4}>No thresholds found</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Tab>
                    </Tabs>
                </div>
                <div className="relative h-14 pr-6">
                    <div className="w-full flex">
                        {currentToken && currentToken.icon && (
                            <Image className="mt-1" width={40} alt="icon" src={`https://www.saucerswap.finance/${currentToken.icon}`} />
                        )}
                        <div className="px-3">
                            <h1 className="font-bold text-lg">{currentToken.symbol}</h1>
                            <p>{currentToken.name}</p>
                        </div>
                        <div className="pl-1">
                            <span className="text-xl text-green-500">${currentToken.priceUsd.toFixed(12)}</span>
                        </div>
                        <Dropdown placement="bottom-start">
                            <DropdownTrigger>
                                <div className="w-5 pt-1 pl-1 cursor-pointer">
                                    <ChevronDownIcon />
                                </div>
                            </DropdownTrigger>
                            <DropdownMenu 
                                onAction={(key) => (selectCurrentToken(key as string) )} 
                                className="max-h-72 overflow-scroll w-full" 
                                aria-label="Token Selection" 
                                items={Array.isArray(tokens) ? tokens : []} 
                                variant="flat"
                            >
                                {(token:Token) => (
                                    <DropdownItem textValue={token.name} key={token.id} className="h-14 gap-2">
                                            <p>{token.name}</p>
                                    </DropdownItem>
                                )}
                            </DropdownMenu>
                        </Dropdown>
                    </div>
                    <div className="w-full pt-8 pb-8">
                        {Array.isArray(currentPools) && currentPools.length > 0 && (
                            <div className="mb-8">
                                {!currentPool ? (
                                    <Select 
                                        items={currentPools}
                                        label="Select Pool"
                                        isDisabled={account ? false : true}
                                        onSelectionChange={(key) => handleCurrentPool(key as string)}
                                        selectedKeys={currentPool ? new Set([currentPool.id.toString()]) : new Set()}
                                        placeholder="Select Pool"
                                    >
                                        {(pool:any) => (
                                            <SelectItem key={pool.id.toString()}>{pool.tokenA?.symbol} - {pool.tokenB?.symbol} / fee: {pool.fee / 10_000.0}%</SelectItem>
                                        )}
                                    </Select>
                                ):(
                                    <p>Pool: {currentPool.tokenA?.symbol} - {currentPool.tokenB?.symbol} / fee: {currentPool.fee / 10_000.0}% <Button size="sm" variant="light" onClick={() => setCurrentPool(null)}>Clear</Button></p>
                                )}
                                
                            </div>
                        
                        )}
                        {!Array.isArray(currentPools) || currentPools.length === 0 && (
                            <p className="pb-8">No pools found for {currentToken.symbol}</p>
                        )}
                        <p className="mb-4">Trade Amount</p>
                        <Input
                            type="number"
                            value={String(tradeAmount)}
                            description="  "
                            onChange={(e) => setTradeAmount(e.target.value)}
                            isDisabled={tradeToken ? false : true}
                            className="text-lg"
                            classNames={{
                                input: "text-xl pl-4", // Increased font size and added left padding
                                inputWrapper: "items-center h-16",
                                mainWrapper: "h-16",
                            }}
                            startContent={
                                <div className="flex items-center mr-2">
                                    <Image className="mt-1" width={40} alt="icon" src={`https://www.saucerswap.finance/${currentToken.icon}`} /> 
                                    <ArrowRightIcon className="w-4 h-4 mt-1 mr-2 ml-2" />
                                    {tradeToken && <Image className="mt-1" width={40} alt="icon" src={`https://www.saucerswap.finance/${tradeToken.icon}`} />}
                                </div>
                            }
                            endContent={
                                <Chip onClick={handleMaxClick} className="cursor-pointer" radius="sm" size="sm">MAX</Chip>
                            }
                            step="0.000001"
                        />

                        <p className="mt-4">Recieve Amount</p>
                        <Input
                            type="number"
                            value="0.0"
                            className="text-lg pt-4"
                            classNames={{
                                input: "text-xl pl-4", // Increased font size and added left padding
                                inputWrapper: "items-center h-16",
                                mainWrapper: "h-16",
                            }}
                            step="0.000001"
                            isDisabled={tradeToken ? false : true}
                            startContent={
                                <div className="flex items-center mr-2">
                                    {tradeToken && <Image className="mt-1" width={30} alt="icon" src={`https://www.saucerswap.finance/${tradeToken.icon}`} />}
                                </div>
                            }
                        />
                    </div>
                    <div className="w-full flex flex-col gap-4">
                        <Switch isDisabled={currentPool ? false : true} size="sm" color="default" onValueChange={setStopLoss}>Stop Loss</Switch>
                        <Switch isDisabled={currentPool ? false : true} size="sm" color="default" onValueChange={setBuyOrder}>Buy Order</Switch>
                    </div>
                    
                    {stopLoss && <div className="w-full my-4 flex flex-col gap-4">
                        <Input maxLength={12} onChange={(e) => setStopLossPrice(Number(e.target.value))} step="0.000001" type="number" value={stopLossPrice.toString()} label="Sell Price (usd)" labelPlacement="outside" />
                        <Input maxLength={12} onChange={(e) => setStopLossCap(Number(e.target.value))} step="0.000001" type="number" value={stopLossCap.toString()} label="Sell Cap" labelPlacement="outside" />
                    </div>}
                    {buyOrder && <div className="w-full my-4 flex flex-col gap-4">
                        <Input maxLength={12} onChange={(e) => setBuyOrderPrice(Number(e.target.value))} step="0.000001" type="number" value={buyOrderPrice.toString()} label="Buy Price (usd)" labelPlacement="outside" />
                        <Input maxLength={12} onChange={(e) => setBuyOrderCap(Number(e.target.value))} step="0.000001" type="number" value={buyOrderCap.toString()} label="Buy Order Cap" labelPlacement="outside" />
                    </div>}
                    {(buyOrder || stopLoss) && (
                        <Button className="mb-6" onClick={() => saveThresholds()}>Set Thresholds</Button>
                    )}
                    <Button isDisabled={currentPool ? false : true} onClick={handleQuote} className="w-full mt-12" endContent={<ArrowsRightLeftIcon className="w-4 h-4" />}>Trade</Button>
                </div>
            </div>
        </div>
    );
}