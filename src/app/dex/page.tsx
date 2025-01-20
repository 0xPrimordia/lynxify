"use client"
import React, { useState, useEffect, useRef, FocusEvent } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tabs, Tab, Image, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input, Chip, Switch, Select, SelectItem, Alert, Popover, PopoverTrigger, PopoverContent } from "@nextui-org/react";

import { useSaucerSwapContext, Token } from "../hooks/useTokens";
import useTokenPriceHistory from "../hooks/useTokenPriceHistory";
import dynamic from 'next/dynamic'
import { useRouter } from "next/navigation";
import { useWalletContext } from "../hooks/useWallet";
import { useNFTGate } from "../hooks/useNFTGate";
import { Threshold } from "../types";
import { ArrowRightIcon } from "@heroicons/react/16/solid";
import { 
    getSwapType, 
    swapHbarToToken, 
    swapTokenToHbar, 
    swapTokenToToken, 
    getQuoteExactInput,
    type SwapResponse 
} from '../lib/saucerswap';
import { ethers } from 'ethers';
import TestnetAlert from "../components/TestnetAlert";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";
import { Button } from '@nextui-org/react';
import { WHBAR_ID } from "../lib/constants";
import { ThresholdSection } from '../components/ThresholdSection';
import { getTokenImageUrl } from '@/app/lib/utils/tokens';
import { Pool, ApiToken } from '@/app/types';

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
import { usePoolContext } from "../hooks/usePools";
import { useRewards } from "../hooks/useRewards";
  
export default function DexPage() {
    const router = useRouter();
    const { account, userId, signAndExecuteTransaction } = useWalletContext();
    const { awardXP } = useRewards(userId || undefined, account || undefined);
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
    const [receiveAmount, setReceiveAmount] = useState("0.0");
    const [sellOrder, setSellOrder] = useState(false);
    const [sellOrderPrice, setSellOrderPrice] = useState(currentToken.priceUsd.toString());
    const [sellOrderCap, setSellOrderCap] = useState("0.0");
    const [alertState, setAlertState] = useState<{
        isVisible: boolean;
        message: string;
        type: 'success' | 'danger';
    }>({
        isVisible: false,
        message: '',
        type: 'success'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
    const [customSlippage, setCustomSlippage] = useState<string>("");
    const [showCustomSlippage, setShowCustomSlippage] = useState<boolean>(false);
    const [stopLossSlippage, setStopLossSlippage] = useState<number>(0.5);
    const [buyOrderSlippage, setBuyOrderSlippage] = useState<number>(0.5);
    const [sellOrderSlippage, setSellOrderSlippage] = useState<number>(0.5);
    const [selectedThresholdType, setSelectedThresholdType] = useState<'stopLoss' | 'buyOrder' | 'sellOrder' | null>(null);

    useEffect(() => {
        if (currentToken && currentToken.priceUsd) {
            setStopLossPrice(currentToken.priceUsd.toString());
            setSellOrderPrice(currentToken.priceUsd.toString());
        }
    }, [currentToken]);

    useEffect(() => {
        if (nftGateLoading) return; // Only check nftGateLoading
        if (!account || !hasAccess) {
            router.push('/');
        }
    }, [account, hasAccess, nftGateLoading, router]);

    useEffect(() => {
        if(!pools || !currentToken) return;
        const pairs = pools.filter((pool: Pool) => 
            (pool.tokenA?.id === currentToken.id) || (pool.tokenB?.id === currentToken.id)
        );
        if (JSON.stringify(pairs) !== JSON.stringify(prevPoolsRef.current)) {
            setCurrentPools(pairs);
            prevPoolsRef.current = pairs;
        }
    }, [pools, currentToken]);

    useEffect(() => {
        const fetchThresholds = async () => {
            try {
                const response = await fetch(`/api/thresholds?userId=${userId}`);
                const data = await response.json();
                if (response.ok) {
                    setThresholds(data);
                } else {
                    console.error('Error fetching thresholds:', data.error);
                }
            } catch (error) {
                console.error('Error fetching thresholds:', error);
            }
        };

        if (userId) {
            fetchThresholds();
        }
    }, [userId]);

    useEffect(() => {
        if (!tokens || !tokens.length) return;
        
        // Find WHBAR token from the loaded tokens using correct ID
        const whbarToken = tokens.find((token: Token) => token.id === "0.0.15058");
        if (whbarToken) {
            setCurrentToken(whbarToken);
        }
    }, [tokens]); // Only run when tokens are loaded/updated

    // Helper function to validate and format price
    const formatPrice = (price: number | string | undefined): string => {
        if (!price || isNaN(Number(price)) || Number(price) === 0) {
            return "0.00";  // or return a dash "-" if you prefer
        }
        return Number(price).toFixed(8);
    };

    const calculateMaxAmount = (balance: string, decimals: number, isHbar: boolean = false) => {
        const rawBalance = Number(balance);
        if (isHbar) {
            // For HBAR, reserve 0.1 HBAR for gas
            const gasReserve = 0.1 * Math.pow(10, decimals);
            return Math.max(0, (rawBalance - gasReserve) / Math.pow(10, decimals)).toString();
        }
        // For tokens, return full balance as gas is paid in HBAR
        return (rawBalance / Math.pow(10, decimals)).toString();
    };

    useEffect(() => {
        console.log('Current slippage tolerance:', {
            slippageTolerance,
            basisPoints: Math.floor(slippageTolerance * 100)
        });
    }, [slippageTolerance]);

    const handleQuote = async () => {
        if (!currentPool || !currentToken || !tradeToken || !account) return;

        try {
            let result: any = { tx: null, type: null };
            const slippageBasisPoints = Math.floor(slippageTolerance * 100);

            console.log('Trade execution parameters:', {
                tradeAmount,
                slippageTolerance,
                slippageBasisPoints,
                tradeType: getTradeType()
            });

            switch (getTradeType()) {
                case 'hbarToToken':
                    result = await swapHbarToToken(
                        tradeAmount.toString(),
                        tradeToken.id,
                        currentPool.fee || 3000,
                        account,
                        Math.floor(Date.now() / 1000) + 60,
                        slippageBasisPoints,
                        tradeToken.decimals
                    );
                    console.log('HBAR to Token swap result:', result);
                    break;

                case 'tokenToHbar':
                    result = await swapTokenToHbar(
                        tradeAmount.toString(),
                        currentToken.id,
                        currentPool.fee || 3000,
                        account,
                        Math.floor(Date.now() / 1000) + 60,
                        slippageBasisPoints,
                        currentToken.decimals
                    );
                    break;

                case 'tokenToToken':
                    result = await swapTokenToToken(
                        tradeAmount.toString(),
                        currentToken.id,
                        tradeToken.id,
                        currentPool.fee || 3000,
                        account,
                        Math.floor(Date.now() / 1000) + 60,
                        slippageBasisPoints,
                        currentToken.decimals,
                        tradeToken.decimals
                    );
                    break;
            }

            if (result.tx) {
                console.log('Attempting to execute transaction:', result);
                await signAndExecuteTransaction({
                    transactionList: result.tx,
                    signerAccountId: account
                });

                // If it was an association, execute the swap after
                if (result.type === "associate") {
                    result = await swapHbarToToken(
                        tradeAmount.toString(),
                        tradeToken.id,
                        currentPool.fee || 3000,
                        account,
                        Math.floor(Date.now() / 1000) + 60,
                        slippageBasisPoints,
                        tradeToken.decimals
                    );
                    
                    if (result.tx) {
                        await signAndExecuteTransaction({
                            transactionList: result.tx,
                            signerAccountId: account
                        });
                    }
                }

                if (result.type === "swap") {
                    try {
                        await awardXP('FIRST_TRADE');
                    } catch (error) {
                        console.error('Failed to award XP for first trade:', error);
                    }
                }
            }

        } catch (error) {
            console.error('Error in handleQuote:', error);
        }
    };

    const adjustStopLossPrice = (percentageChange: number) => {
        const currentPrice = parseFloat(stopLossPrice);
        if (!isNaN(currentPrice)) {
            const newPrice = currentPrice * (1 - percentageChange);
            setStopLossPrice(newPrice.toFixed(8)); // Using 8 decimal places for precision
        }
    };

    const selectCurrentToken = (tokenId: string) => {
        if (!tokens || !Array.isArray(tokens)) return;
        
        const token = tokens.find((t: ApiToken) => t.id === tokenId);
        if (!token) return;
        
        setCurrentToken(token);
        
        // Only try to get pools if we have a valid token
        const filteredPools = Array.isArray(pools) 
            ? pools.filter((pool: Pool) => 
                pool.tokenA?.id === token.id || pool.tokenB?.id === token.id)
            : [];
        
        setCurrentPools(filteredPools);
        setCurrentPool(null); // Reset pool selection when token changes
        setTradeToken(null);  // Reset trade token when token changes
    };

    const saveThresholds = async (type: 'stopLoss' | 'buyOrder' | 'sellOrder') => {
        if (!account || !userId || !currentPool) {
            setAlertState({
                isVisible: true,
                message: "Missing required data: account, userId, or pool",
                type: "danger"
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const slippageBasisPoints = Math.floor(
                (type === 'stopLoss' ? stopLossSlippage :
                 type === 'buyOrder' ? buyOrderSlippage :
                 sellOrderSlippage) * 100
            );

            const response = await fetch('/api/thresholds/setThresholds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                    userId: userId,
                    slippageBasisPoints
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to set thresholds');
            }

            setAlertState({
                isVisible: true,
                message: `${type} threshold set successfully!`,
                type: "success"
            });

            // Refresh thresholds data
            const refreshResponse = await fetch(`/api/thresholds?userId=${userId}`);
            const refreshedData = await refreshResponse.json();
            setThresholds(refreshedData);

            try {
                await awardXP('SET_THRESHOLD');
            } catch (error) {
                console.error('Failed to award XP for setting threshold:', error);
            }

        } catch (error: any) {
            console.error('Error setting threshold:', error);
            let errorMessage = 'Failed to set threshold';
            
            try {
                const errorData = await error.response?.json();
                console.log('Detailed error information:', errorData);
                
                errorMessage = errorData?.details || errorData?.error || errorMessage;
                
                if (errorData?.debugInfo) {
                    console.log('Debug information:', errorData.debugInfo);
                }
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
            
            setAlertState({
                isVisible: true,
                message: errorMessage,
                type: "danger"
            });
        } finally {
            setIsSubmitting(false);
            resetThresholdForm(); // Move reset here to ensure it happens regardless of success/failure
        }
    };

    const handleCurrentPool = (poolId: string) => {
        if (!currentPools || !Array.isArray(currentPools)) return;
        
        const pool = currentPools.find((p: Pool) => p.id.toString() === poolId);
        if (!pool) return;
        
        setCurrentPool(pool);
        
        // Set trade token based on current token
        if (currentToken && pool.tokenA && pool.tokenB) {
            const tradeToken = pool.tokenA.id === currentToken.id ? pool.tokenB : pool.tokenA;
            setTradeToken(tradeToken);
        }
    };

    const deleteThreshold = async (id: number) => {
        try {
            setIsSubmitting(true);
            const response = await fetch(`/api/thresholds/deleteThreshold`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete threshold');
            }

            // Update local state to remove the deleted threshold
            setThresholds(prevThresholds => 
                prevThresholds.filter(threshold => threshold.id !== id)
            );

            setAlertState({
                isVisible: true,
                message: 'Threshold deleted successfully',
                type: 'success'
            });

        } catch (error) {
            setAlertState({
                isVisible: true,
                message: error instanceof Error ? error.message : 'Failed to delete threshold',
                type: 'danger'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

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
        const isHbar = currentToken.id === "0.0.15058";
        const formattedBalance = calculateMaxAmount(balance, currentToken.decimals, isHbar);
        setTradeAmount(formattedBalance);
        calculateTradeAmount(formattedBalance);
    };

    const handleMaxClickStopLoss = async () => {
        if (!currentToken) return;
        
        const balance = await getTokenBalance(currentToken.id);
        const isHbar = currentToken.id === "0.0.15058";
        const formattedBalance = calculateMaxAmount(balance, currentToken.decimals, isHbar);
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
        const isHbar = currentToken.id === "0.0.15058";
        const formattedBalance = calculateMaxAmount(balance, currentToken.decimals, isHbar);
        setSellOrderCap(formattedBalance);
    };

    const resetThresholdForm = () => {
        setSelectedThresholdType(null);
        setStopLossCap("0.0");
        setStopLossPrice(currentToken?.priceUsd?.toString() || "0.0");
        setBuyOrderCap("0.0");
        setBuyOrderPrice("0.0");
        setSellOrderCap("0.0");
        setSellOrderPrice(currentToken?.priceUsd?.toString() || "0.0");
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (alertState.isVisible) {
            timer = setTimeout(() => {
                setAlertState(prev => ({ ...prev, isVisible: false }));
            }, 3000); // Hide after 3 seconds
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [alertState.isVisible]);

    const handleSlippageChange = (value: number | string) => {
        if (typeof value === 'number') {
            setSlippageTolerance(value);
            setShowCustomSlippage(false);
            setCustomSlippage("");
        } else {
            // Handle custom input
            const parsed = parseFloat(value);
            if (!isNaN(parsed) && parsed > 0 && parsed < 100) {
                setSlippageTolerance(parsed);
            }
            setCustomSlippage(value);
        }
    };

    const SlippageSelector = () => (
        <Popover placement="top">
            <PopoverTrigger>
                <Button 
                    size="sm" 
                    variant="light" 
                    startContent={<AdjustmentsHorizontalIcon className="w-4 h-4" />}
                >
                    {slippageTolerance}% Slippage
                </Button>
            </PopoverTrigger>
            <PopoverContent>
                <div className="p-4">
                    <p className="text-sm mb-2">Slippage Tolerance</p>
                    <div className="flex gap-2 mb-2">
                        {[0.1, 0.5, 1.0].map((value) => (
                            <Button
                                key={value}
                                size="sm"
                                variant={slippageTolerance === value ? "solid" : "light"}
                                onPress={() => handleSlippageChange(value)}
                            >
                                {value}%
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant={showCustomSlippage ? "solid" : "light"}
                            onPress={() => setShowCustomSlippage(true)}
                        >
                            Custom
                        </Button>
                        {showCustomSlippage && (
                            <Input
                                size="sm"
                                type="number"
                                value={customSlippage}
                                onChange={(e) => handleSlippageChange(e.target.value)}
                                placeholder="0.00"
                                endContent="%"
                                min="0.01"
                                max="99.99"
                                step="0.01"
                                className="w-24"
                            />
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Your transaction will revert if the price changes unfavorably by more than this percentage.
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );

    const getTradeType = () => {
        if (!currentToken || !tradeToken) return null;

        if (currentToken.id === WHBAR_ID) {
            return 'hbarToToken';
        }
        else if (tradeToken.id === WHBAR_ID) {
            return 'tokenToHbar';
        }
        else {
            return 'tokenToToken';
        }
    };

    const ThresholdSlippageSelector = ({ 
        slippage, 
        setSlippage, 
        label = "Slippage Tolerance" 
    }: { 
        slippage: number; 
        setSlippage: (value: number) => void; 
        label?: string;
    }) => (
        <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-sm text-default-500">{label}</span>
            <Popover placement="top">
                <PopoverTrigger>
                    <Button 
                        size="sm" 
                        variant="light" 
                        startContent={<AdjustmentsHorizontalIcon className="w-4 h-4" />}
                    >
                        {slippage}% Slippage
                    </Button>
                </PopoverTrigger>
                <PopoverContent>
                    <div className="p-4">
                        <div className="flex gap-2 mb-2">
                            {[0.1, 0.5, 1.0].map((value) => (
                                <Button
                                    key={value}
                                    size="sm"
                                    variant={slippage === value ? "solid" : "light"}
                                    onPress={() => setSlippage(value)}
                                >
                                    {value}%
                                </Button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Your transaction will revert if the price changes unfavorably by more than this percentage.
                        </p>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );

    // Helper function to get token icon by ID
    const getTokenIcon = (tokenId: string) => {
        const token = tokens.find((t: Token) => t.id === tokenId);
        return token?.icon || '';
    };

    if (nftGateLoading) {
        return <div>Loading...</div>;
    }

    return (    
        <div className="fixed inset-0 flex flex-col w-full pt-16">
            <div className="relative">
                <TestnetAlert />
            </div>
            <div className="flex flex-1 overflow-hidden pl-8">
                {/* Left side - Chart */}
                <div className="w-[70%] pr-8">
                    <Tabs 
                        aria-label="section" 
                        selectedKey={selectedSection} 
                        onSelectionChange={(key) => setSelectedSection(key.toString())}
                    >
                        <Tab key="chart" title='Price Chart'>
                            <div className="w-full h-[calc(100vh-120px)]">
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
                            <div className="h-[calc(100vh-120px)] overflow-y-auto">
                                <div className="pb-24">
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
                                                        <TableCell>
                                                            <Image 
                                                                src={getTokenImageUrl(getTokenIcon(threshold.tokenA))}
                                                                alt="Token A"
                                                                width={30}
                                                                height={30}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Image 
                                                                src={getTokenImageUrl(getTokenIcon(threshold.tokenB))}
                                                                alt="Token B"
                                                                width={30}
                                                                height={30}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{threshold.fee / 10_000.0}%</TableCell>
                                                        <TableCell>${threshold.price}</TableCell>
                                                        <TableCell>{threshold.cap}</TableCell>
                                                        <TableCell>
                                                            <Button 
                                                                onPress={() => deleteThreshold(threshold.id)}
                                                                aria-label={`Delete threshold ${threshold.id}`}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div>No thresholds found</div>
                                    )}
                                </div>
                            </div>
                        </Tab>
                    </Tabs>
                </div>

                {/* Right side - Trading UI */}
                <div className="w-[30%] overflow-y-auto pr-6 pb-24">
                    <div className="w-full flex">
                        {currentToken && currentToken.icon && (
                            <Image className="mt-1" width={40} alt="icon" src={getTokenImageUrl(currentToken.icon)} />
                        )}
                        <div className="px-3">
                            <h1 className="font-bold text-lg">{currentToken.symbol}</h1>
                            <p>{currentToken.name}</p>
                        </div>
                        <div className="pl-1">
                            <span className="text-xl text-green-500">
                                ${formatPrice(currentToken?.priceUsd)}
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
                                            <SelectItem 
                                                key={pool.id.toString()} 
                                                textValue={`${pool.tokenA?.symbol} - ${pool.tokenB?.symbol} pool with ${pool.fee / 10_000.0}% fee`}
                                            >
                                                {pool.tokenA?.symbol} - {pool.tokenB?.symbol} / fee: {pool.fee / 10_000.0}%
                                            </SelectItem>
                                        )}
                                    </Select>
                                ):(
                                    <p>Pool: {currentPool.tokenA?.symbol} - {currentPool.tokenB?.symbol} / fee: {currentPool.fee / 10_000.0}% <Button size="sm" variant="light" onPress={() => setCurrentPool(null)} aria-label="Clear pool selection">Clear</Button></p>
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
                                    <Image className="mt-1" width={40} alt="icon" src={getTokenImageUrl(currentToken.icon)} /> 
                                    <ArrowRightIcon className="w-4 h-4 mt-1 mr-2 ml-2" />
                                    {tradeToken && <Image className="mt-1" width={40} alt="icon" src={getTokenImageUrl(tradeToken.icon)} />}
                                </div>
                            }
                            endContent={
                                <Button 
                                    onClick={handleMaxClick} 
                                    aria-label="Set maximum amount"
                                    className="cursor-pointer" 
                                    radius="sm" 
                                    size="sm"
                                >
                                    MAX
                                </Button>
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
                                    {tradeToken && <Image className="mt-1" width={30} alt="icon" src={getTokenImageUrl(tradeToken.icon)} />}
                                </div>
                            }
                        />
                        <ThresholdSlippageSelector 
                            slippage={slippageTolerance} 
                            setSlippage={setSlippageTolerance}
                            label="Trade Slippage"
                        />
                        <Button 
                            isDisabled={currentPool ? false : true} 
                            onPress={handleQuote} 
                            className="w-full" 
                            endContent={<ArrowsRightLeftIcon className="w-4 h-4" />}
                        >
                            Trade
                        </Button>
                    </div>
                    <ThresholdSection
                        selectedThresholdType={selectedThresholdType}
                        setSelectedThresholdType={setSelectedThresholdType}
                        currentPool={currentPool}
                        currentToken={currentToken}
                        tradeToken={tradeToken}
                        stopLossPrice={stopLossPrice}
                        stopLossCap={stopLossCap}
                        buyOrderPrice={buyOrderPrice}
                        buyOrderCap={buyOrderCap}
                        sellOrderPrice={sellOrderPrice}
                        sellOrderCap={sellOrderCap}
                        stopLossSlippage={stopLossSlippage}
                        buyOrderSlippage={buyOrderSlippage}
                        sellOrderSlippage={sellOrderSlippage}
                        isSubmitting={isSubmitting}
                        setStopLossPrice={setStopLossPrice}
                        setStopLossCap={setStopLossCap}
                        setBuyOrderPrice={setBuyOrderPrice}
                        setBuyOrderCap={setBuyOrderCap}
                        setSellOrderPrice={setSellOrderPrice}
                        setSellOrderCap={setSellOrderCap}
                        setStopLossSlippage={setStopLossSlippage}
                        setBuyOrderSlippage={setBuyOrderSlippage}
                        setSellOrderSlippage={setSellOrderSlippage}
                        handleInputFocus={handleInputFocus}
                        adjustStopLossPrice={adjustStopLossPrice}
                        adjustSellOrderPrice={adjustSellOrderPrice}
                        hanndleMaxClickStopLoss={handleMaxClickStopLoss}
                        handleMaxClickSellOrder={handleMaxClickSellOrder}
                        saveThresholds={saveThresholds}
                        resetThresholdForm={resetThresholdForm}
                    />
                </div>
            </div>
            
            {alertState.isVisible && (
                <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
                    <Alert 
                        className="min-w-[300px]"
                        color={alertState.type}
                        variant="solid"
                        isClosable
                        onClose={() => setAlertState(prev => ({ ...prev, isVisible: false }))}
                    >
                        {alertState.message}
                    </Alert>
                </div>
            )}
        </div>
    );
}