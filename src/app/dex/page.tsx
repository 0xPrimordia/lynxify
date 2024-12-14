"use client"
import React, { useState, useEffect, useRef, FocusEvent } from "react";
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
import { getQuoteExactInput } from "../lib/saucerswap";
import { ethers } from 'ethers';
import { QuestionMarkCircleIcon } from "@heroicons/react/16/solid";
import { Tooltip } from "@nextui-org/react";

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
    const [buyOrderPrice, setBuyOrderPrice] = useState("0.0");
    const [stopLossCap, setStopLossCap] = useState("0.0");
    const [buyOrderCap, setBuyOrderCap] = useState("0.0");
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
    const [stopLossPrice, setStopLossPrice] = useState(currentToken.priceUsd.toString());
    const { data, loading, error } = useTokenPriceHistory(currentToken.id, from, to, interval);
    const prevPoolsRef = useRef<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [receiveAmount, setReceiveAmount] = useState("0.0");
    const [sellOrder, setSellOrder] = useState(false);
    const [sellOrderPrice, setSellOrderPrice] = useState(currentToken.priceUsd.toString());
    const [sellOrderCap, setSellOrderCap] = useState("0.0");

    useEffect(() => {
        if (currentToken && currentToken.priceUsd) {
            setStopLossPrice(currentToken.priceUsd.toString());
            setSellOrderPrice(currentToken.priceUsd.toString());
        }
    }, [currentToken]);

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
        console.log('Wallet Context:', {
            account,
            userId,
            hasWallet: !!dAppConnector
        });
        const fetchThresholds = async () => {
            if (!userId) {
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                const response = await fetch(`/api/thresholds?userId=${userId}`);
                console.log('Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('Fetched thresholds data:', data);
                
                setThresholds(Array.isArray(data) ? data : []);
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

    const formatPrice = (price: number) => {
        // Handle invalid values
        if (!price || !isFinite(price)) {
            console.warn('Invalid price detected:', price);
            return '$0.00';
        }

        // Handle HBARX edge case (or any token with clearly invalid price)
        if (price > 1e10 || price.toString().includes('e+')) {
            console.warn('Invalid price data detected:', {
                token: currentToken.symbol,
                price: price
            });
            return 'Price Unavailable';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        }).format(price);
    };

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

    const adjustStopLossPrice = (percentageChange: number) => {
        const currentPrice = parseFloat(stopLossPrice);
        if (!isNaN(currentPrice)) {
            const newPrice = currentPrice * (1 - percentageChange);
            setStopLossPrice(newPrice.toFixed(8)); // Using 8 decimal places for precision
        }
    };

    const selectCurrentToken = async (tokenId:string) => {
        const token = tokens.find((token:Token) => token.id === tokenId);
        if (token) {
            setCurrentToken(token);
            setCurrentPool(null);
            console.log("Current token", token);
        }
    }

    const saveThresholds = async (type: 'stopLoss' | 'buyOrder' | 'sellOrder') => {
        const response = await fetch('/api/thresholds/setThresholds', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                type,
                price: type === 'stopLoss' ? stopLossPrice :
                      type === 'buyOrder' ? buyOrderPrice :
                      sellOrderPrice,
                cap: type === 'stopLoss' ? stopLossCap :
                     type === 'buyOrder' ? buyOrderCap :
                     sellOrderCap,
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
        calculateTradeAmount(formattedBalance);
    };

    const hanndleMaxClickStopLoss = async () => {
        if (!currentToken) return;
        
        const balance = await getTokenBalance(currentToken.id);
        // Convert from smallest unit to decimal representation based on token decimals
        const formattedBalance = (Number(balance) / Math.pow(10, currentToken.decimals)).toString();
        setStopLossCap(formattedBalance);
    };

    const handleInputFocus = (event: FocusEvent<Element>) => {
        if (event.target instanceof HTMLInputElement) {
            event.target.select();
        }
    };

    useEffect(() => {
        console.log("Current pool listener:", currentPool)
    }, [currentPool]);

    const calculateTradeAmount = async (amount: string) => {
        if (!currentPool || !tradeToken || !currentToken || !amount || Number(amount) <= 0) {
            setReceiveAmount("0.0");
            return;
        }

        try {
            // Ensure we're working with a clean number
            const cleanAmount = amount.replace(/[^0-9.]/g, '');
            
            console.log('Trade amount calculation:', {
                input: {
                    amount: cleanAmount,
                    token: currentToken.symbol,
                    decimals: currentToken.decimals,
                    expectedRawAmount: (Number(cleanAmount) * Math.pow(10, currentToken.decimals)).toString()
                },
                output: {
                    token: tradeToken.symbol,
                    decimals: tradeToken.decimals
                }
            });

            const quoteAmount = await getQuoteExactInput(
                currentToken.id,
                currentToken.decimals,
                tradeToken.id,
                cleanAmount,
                currentPool.fee,
                tradeToken.decimals
            );
            
            const formattedAmount = ethers.formatUnits(quoteAmount, tradeToken.decimals);
            
            console.log('Quote result:', {
                rawQuote: quoteAmount.toString(),
                outputDecimals: tradeToken.decimals,
                formattedAmount: formattedAmount
            });
            
            setReceiveAmount(formattedAmount);
        } catch (error) {
            console.error('Error calculating trade amount:', error);
            setReceiveAmount("0.0");
        }
    };

    const adjustSellOrderPrice = (percentageChange: number) => {
        const currentPrice = parseFloat(sellOrderPrice);
        if (!isNaN(currentPrice)) {
            const newPrice = currentPrice * (1 + percentageChange);
            setSellOrderPrice(newPrice.toFixed(8));
        }
    };

    const handleMaxClickSellOrder = async () => {
        if (!currentToken) return;
        
        const balance = await getTokenBalance(currentToken.id);
        const formattedBalance = (Number(balance) / Math.pow(10, currentToken.decimals)).toString();
        setSellOrderCap(formattedBalance);
    };

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
                            <div className="w-full h-[350px]">
                                {error ? (
                                    <div className="flex justify-center items-center h-full">
                                        <p>Error loading chart data</p>
                                    </div>
                                ) : (
                                    <ApexChart data={data || []} />
                                )}
                            </div>
                        </Tab>
                        <Tab key="thresholds" title='Thresholds'>
                            {thresholds.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableColumn>Threshold Type</TableColumn>
                                        <TableColumn>Token A</TableColumn>
                                        <TableColumn>Token B</TableColumn>
                                        <TableColumn>Fee</TableColumn>
                                        <TableColumn>Price</TableColumn>
                                        <TableColumn>Cap</TableColumn>
                                        <TableColumn>Delete</TableColumn>
                                    </TableHeader>
                                    <TableBody>
                                        {thresholds.map((threshold: Threshold) => (
                                            <TableRow key={threshold.id}>
                                                <TableCell>{threshold.type}</TableCell>
                                                <TableCell>{threshold.tokenA}</TableCell>
                                                <TableCell>{threshold.tokenB}</TableCell>
                                                <TableCell>{threshold.fee}</TableCell>
                                                <TableCell>${threshold.price}</TableCell>
                                                <TableCell>{threshold.cap}</TableCell>
                                                <TableCell>
                                                    <Button onClick={() => deleteThreshold(threshold.id)}>Delete</Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div>No thresholds found</div>
                            )}
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
                            <span className="text-xl text-green-500">
                                {formatPrice(currentToken.priceUsd)}
                            </span>
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
                            onChange={(e) => {
                                setTradeAmount(e.target.value);
                                calculateTradeAmount(e.target.value);
                            }}
                            onFocus={handleInputFocus}
                            isDisabled={tradeToken ? false : true}
                            className="text-lg"
                            classNames={{
                                input: "text-xl pl-4",
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

                        <p className="mt-4">Receive Amount</p>
                        <Input
                            type="number"
                            value={receiveAmount}
                            className="text-lg pt-4"
                            isReadOnly={true}
                            classNames={{
                                input: "text-xl pl-4",
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
                        <Button isDisabled={currentPool ? false : true} onClick={handleQuote} className="w-full mt-12" endContent={<ArrowsRightLeftIcon className="w-4 h-4" />}>Trade</Button>
                    </div>
                    <div className="w-full flex flex-col gap-4 pb-8">
                        <div className="flex items-center gap-2">
                            <Switch 
                                isDisabled={currentPool ? false : true} 
                                size="sm" 
                                color="default" 
                                onValueChange={setStopLoss}
                            >
                                Stop Loss
                            </Switch>
                            <Tooltip 
                                content="Automatically sells your tokens when the price falls below the specified threshold"
                                className="max-w-[200px]"
                                placement="bottom"
                                showArrow={true}
                            >
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                        {stopLoss && <div className="w-full my-4 flex flex-col gap-4">
                            <p>Sell Price (usd)</p>
                            <Input
                                onFocus={handleInputFocus}
                                className="text-lg"
                                classNames={{
                                    input: "text-xl pl-4",
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
                                maxLength={12} 
                                onChange={(e) => setStopLossPrice(e.target.value)} 
                                step="0.000001" 
                                type="number" 
                                value={stopLossPrice.toString()}
                            />
                            <div className="flex gap-2 mt-2">
                                <Button 
                                    size="sm" 
                                    variant="flat" 
                                    onClick={() => adjustStopLossPrice(0.01)}
                                >
                                    -1%
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="flat" 
                                    onClick={() => adjustStopLossPrice(0.05)}
                                >
                                    -5%
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="flat" 
                                    onClick={() => adjustStopLossPrice(0.10)}
                                >
                                    -10%
                                </Button>
                            </div>
                            <p>Sell Cap (qty of tokens to sell)</p>
                            <Input
                                onFocus={handleInputFocus}
                                className="text-lg"
                                classNames={{
                                    input: "text-xl pl-4",
                                    inputWrapper: "items-center h-16",
                                    mainWrapper: "h-16",
                                }}
                                maxLength={12} 
                                onChange={(e) => setStopLossCap(e.target.value)} 
                                step="0.000001" 
                                type="number" 
                                value={stopLossCap.toString()}
                                endContent={
                                    <Chip onClick={hanndleMaxClickStopLoss} className="cursor-pointer" radius="sm" size="sm">MAX</Chip>
                                }
                            />
                            {stopLoss && (
                                <Button className="mb-2" onClick={() => saveThresholds('stopLoss')}>
                                    Set Stop-Loss
                                </Button>
                            )}
                        </div>}
                        <div className="flex items-center gap-2">
                            <Switch 
                                isDisabled={currentPool ? false : true} 
                                size="sm" 
                                color="default" 
                                onValueChange={setBuyOrder}
                            >
                                Buy Order
                            </Switch>
                            <Tooltip 
                                content="Automatically buys tokens when the price falls to the specified threshold"
                                className="max-w-[200px]"
                                placement="bottom"
                                showArrow={true}
                            >
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                        {buyOrder && <div className="w-full my-4 flex flex-col gap-4">
                            <p>Buy Price (usd)</p>
                            <Input 
                                onFocus={handleInputFocus}
                                className="text-lg"
                                classNames={{
                                    input: "text-xl pl-4",
                                    inputWrapper: "items-center h-16",
                                    mainWrapper: "h-16",
                                }}
                                maxLength={12} 
                                onChange={(e) => setBuyOrderPrice(e.target.value)} 
                                step="0.000001" 
                                type="number" 
                                value={buyOrderPrice.toString()} 
                                startContent={
                                    <div className="flex items-center mr-2">
                                        {tradeToken && <Image className="mt-1" width={40} alt="icon" src={`https://www.saucerswap.finance/${tradeToken.icon}`} />}
                                        <ArrowRightIcon className="w-4 h-4 mt-1 mr-2 ml-2" />
                                        <Image className="mt-1" width={40} alt="icon" src={`https://www.saucerswap.finance/${currentToken.icon}`} /> 
                                    </div>
                                }
                            />
                            <Input 
                                onFocus={handleInputFocus}
                                maxLength={12} 
                                onChange={(e) => setBuyOrderCap(e.target.value)} 
                                step="0.000001" 
                                type="number" 
                                value={buyOrderCap.toString()} 
                                className="text-lg"
                                classNames={{
                                    input: "text-xl pl-4",
                                    inputWrapper: "items-center h-16",
                                    mainWrapper: "h-16",
                                }}
                            />
                        </div>}
                        {buyOrder && (
                            <Button className="mb-2" onClick={() => saveThresholds('buyOrder')}>
                                Set Buy Order
                            </Button>
                        )}
                        <div className="flex items-center gap-2">
                            <Switch 
                                isDisabled={currentPool ? false : true} 
                                size="sm" 
                                color="default" 
                                onValueChange={setSellOrder}
                            >
                                Sell Order
                            </Switch>
                            <Tooltip 
                                content="Automatically sells your tokens when the price rises to the specified threshold"
                                className="max-w-[200px]"
                                placement="bottom"
                                showArrow={true}
                            >
                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                            </Tooltip>
                        </div>
                        {sellOrder && <div className="w-full my-4 flex flex-col gap-4">
                            <p>Sell Price (usd)</p>
                            <Input
                                onFocus={handleInputFocus}
                                className="text-lg"
                                classNames={{
                                    input: "text-xl pl-4",
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
                                maxLength={12} 
                                onChange={(e) => setSellOrderPrice(e.target.value)} 
                                step="0.000001" 
                                type="number" 
                                value={sellOrderPrice.toString()}
                            />
                            <div className="flex gap-2 mt-2">
                                <Button 
                                    size="sm" 
                                    variant="flat" 
                                    onClick={() => adjustSellOrderPrice(0.01)}
                                >
                                    +1%
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="flat" 
                                    onClick={() => adjustSellOrderPrice(0.05)}
                                >
                                    +5%
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="flat" 
                                    onClick={() => adjustSellOrderPrice(0.10)}
                                >
                                    +10%
                                </Button>
                            </div>
                            <p>Sell Cap (qty of tokens to sell)</p>
                            <Input
                                onFocus={handleInputFocus}
                                className="text-lg"
                                classNames={{
                                    input: "text-xl pl-4",
                                    inputWrapper: "items-center h-16",
                                    mainWrapper: "h-16",
                                }}
                                maxLength={12} 
                                onChange={(e) => setSellOrderCap(e.target.value)} 
                                step="0.000001" 
                                type="number" 
                                value={sellOrderCap.toString()}
                                endContent={
                                    <Chip onClick={handleMaxClickSellOrder} className="cursor-pointer" radius="sm" size="sm">MAX</Chip>
                                }
                            />
                            {sellOrder && (
                                <Button className="mb-2" onClick={() => saveThresholds('sellOrder')}>
                                    Set Sell Order
                                </Button>
                            )}
                        </div>}
                    </div>
                    
                </div>
            </div>
        </div>
    );
}