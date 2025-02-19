"use client"
import React, { useState, useEffect, useRef, FocusEvent, useMemo } from "react";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Tabs, Tab, Image, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Input, Chip, Switch, Select, SelectItem, Alert, Popover, PopoverTrigger, PopoverContent, Tooltip, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react";
import { useSaucerSwapContext } from "../hooks/useTokens";
import useTokenPriceHistory from "../hooks/useTokenPriceHistory";
import { useRouter } from "next/navigation";
import { useWalletContext } from "../hooks/useWallet";
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
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { ArrowsRightLeftIcon } from "@heroicons/react/16/solid";
import { usePoolContext } from "../hooks/usePools";
import { useRewards } from "../hooks/useRewards";
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { Pool, ApiToken, Token } from '../types';
import { WHBAR_ID } from "../lib/constants";
import { getTokenImageUrl } from '../lib/utils/tokens';
import { ThresholdSection } from '../components/ThresholdSection';
import PriceChart, { ChartData } from '../components/PriceChart';
import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { checkTokenAssociation, associateToken } from '@/app/lib/utils/tokens';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useInAppWallet } from '../contexts/InAppWalletContext';
import { AccountBalanceQuery, TokenId, AccountId, Client } from "@hashgraph/sdk";
import { usePasswordModal } from '../hooks/usePasswordModal';
import { handleInAppTransaction, handlePasswordSubmit as handleInAppPasswordSubmit } from '../lib/transactions/inAppWallet';
import { handleExtensionTransaction } from '../lib/transactions/extensionWallet';
import { PasswordModal } from '../components/PasswordModal';
import { PasswordModalContext } from '../types';

export default function DexPage() {
    const router = useRouter();
    const { account, signAndExecuteTransaction, isConnecting } = useWalletContext();
    const { inAppAccount, signTransaction } = useInAppWallet();
    
    // Determine wallet type based on which account is present
    const walletType = inAppAccount ? 'inApp' : account ? 'extension' : null;
    const activeAccount = account || inAppAccount;
    const { awardXP } = useRewards();
    const { supabase } = useSupabase();
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [userAccountId, setUserAccountId] = useState<string | null>(null);
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
    const [isChartCollapsed, setIsChartCollapsed] = useState(true);
    const [selectedRange, setSelectedRange] = useState('1M');
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
    const [tokenSearch, setTokenSearch] = useState("");
    const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
    const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
    const [poolSearch, setPoolSearch] = useState("");
    const [isUsdInput, setIsUsdInput] = useState(false);
    const [usdAmount, setUsdAmount] = useState("0.0");
    const client = Client.forTestnet();
    const { 
        password, 
        setPassword, 
        passwordModalContext, 
        setPasswordModalContext,
        resetPasswordModal 
    } = usePasswordModal();

    const timeRanges = [
        { id: '1H', label: '1H', value: 60 * 60 },
        { id: '1D', label: '1D', value: 24 * 60 * 60 },
        { id: '1W', label: '1W', value: 7 * 24 * 60 * 60 },
        { id: '1M', label: '1M', value: 30 * 24 * 60 * 60 },
        { id: 'ALL', label: 'All', value: 365 * 24 * 60 * 60 }
    ];

    const handleTimeRangeChange = (seconds: number, rangeId: string) => {
        const to = Math.floor(Date.now() / 1000);
        const from = to - seconds;
        setTo(to);
        setFrom(from);
        setSelectedRange(rangeId);
        
        if (seconds <= 60 * 60) {
            setInterval('FIVEMIN');
        } else if (seconds <= 24 * 60 * 60) {
            setInterval('HOUR');
        } else {
            setInterval('DAY');
        }
    };

    useEffect(() => {
        const defaultRange = timeRanges.find(range => range.id === '1M');
        if (defaultRange) {
            handleTimeRangeChange(defaultRange.value, defaultRange.id);
        }
    }, [timeRanges]);

    useEffect(() => {
        if (currentToken && currentToken.priceUsd) {
            setStopLossPrice(currentToken.priceUsd.toString());
            setSellOrderPrice(currentToken.priceUsd.toString());
        }
    }, [currentToken]);

    useEffect(() => {
        if (!currentToken || !pools) return;
        
        // Filter pools to only include those with the current token
        const relevantPools = pools.filter((pool: any) => 
            pool.tokenA?.id === currentToken.id || pool.tokenB?.id === currentToken.id
        );
        
        setCurrentPools(relevantPools);
        // Clear current pool selection when switching tokens
        setCurrentPool(null);
    }, [currentToken, pools]);

    useEffect(() => {
        const fetchThresholds = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.id) return;
                
                const response = await fetch(`/api/thresholds?userId=${session.user.id}`);
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

        fetchThresholds();
    }, [supabase.auth]);

    useEffect(() => {
        if (!tokens || !tokens.length) return;
        
        console.log('Available tokens:', tokens.map((t: Token) => ({
            id: t.id,
            symbol: t.symbol,
            name: t.name
        })));
        
        // Use WHBAR_ID from constants
        const whbarToken = tokens.find((t: Token) => t.id === WHBAR_ID);
        
        if (whbarToken) {
            setCurrentToken(whbarToken);
        } else {
            console.error('Could not find WHBAR token in available tokens');
        }
    }, [tokens]);

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

    const executeTransaction = async (tx: string, description: string) => {
        if (!activeAccount) throw new Error("No active account");
        
        if (walletType === 'inApp') {
            return new Promise((resolve, reject) => {
                handleInAppTransaction(tx, signTransaction, (context) => {
                    setPasswordModalContext({
                        ...context,
                        transactionPromise: { resolve, reject }
                    });
                });
            });
        } else if (walletType === 'extension') {
            return handleExtensionTransaction(tx, account, signAndExecuteTransaction);
        }
        
        throw new Error("No wallet connected");
    };

    const handlePasswordSubmit = async () => {
        if (!passwordModalContext.transaction) return;
        
        setIsSubmitting(true);
        try {
            console.log('Calling handleInAppPasswordSubmit...');
            const result = await handleInAppPasswordSubmit(
                passwordModalContext.transaction,
                password,
                signTransaction,
                setPasswordModalContext
            );
            
            if (result.status === 'ERROR') {
                passwordModalContext.transactionPromise?.reject(new Error(result.error));
            } else {
                passwordModalContext.transactionPromise?.resolve(result);
            }
        } catch (error) {
            passwordModalContext.transactionPromise?.reject(error);
        } finally {
            setIsSubmitting(false);
            resetPasswordModal();
        }
    };

    const handleQuote = async () => {
        if (!currentPool || !currentToken || !tradeToken || !activeAccount) return;

        try {
            console.log('Starting swap with:', {
                currentToken,
                tradeToken,
                amount: tradeAmount,
                pool: currentPool,
                type: getTradeType(),
                slippageBasisPoints: Math.floor(slippageTolerance * 100)
            });

            let transactions: string[] = [];
            
            // Check associations based on trade type
            switch (getTradeType()) {
                case 'hbarToToken':
                    if (!await checkTokenAssociation(activeAccount, tradeToken.id)) {
                        transactions.push(await associateToken(activeAccount, tradeToken.id));
                    }
                    break;
                case 'tokenToHbar':
                    if (!await checkTokenAssociation(activeAccount, currentToken.id)) {
                        transactions.push(await associateToken(activeAccount, currentToken.id));
                    }
                    break;
                case 'tokenToToken':
                    if (!await checkTokenAssociation(activeAccount, currentToken.id)) {
                        transactions.push(await associateToken(activeAccount, currentToken.id));
                    }
                    if (!await checkTokenAssociation(activeAccount, tradeToken.id)) {
                        transactions.push(await associateToken(activeAccount, tradeToken.id));
                    }
                    break;
            }

            console.log('Token association check:', {
                account: activeAccount,
                token: tradeToken.id,
                isAssociated: await checkTokenAssociation(activeAccount, tradeToken.id)
            });

            // Get the swap transaction
            const swapResult = await getSwapTransaction();
            
            console.log('Getting swap transaction...');

            if (swapResult?.type === 'approve') {
                transactions.push(swapResult.tx);
                const actualSwap = await getSwapTransaction();
                if (actualSwap?.tx) {
                    transactions.push(actualSwap.tx);
                }
            } else if (swapResult?.tx) {
                transactions.push(swapResult.tx);
            }

            console.log('Swap transaction result:', swapResult);

            // Execute all transactions in sequence
            if (transactions.length > 0) {
                for (const tx of transactions) {
                    console.log('Executing transaction:', {
                        tx: tx.substring(0, 100) + '...',
                        type: getTradeType()
                    });
                    const result = await executeTransaction(tx, 'Swap transaction');
                    console.log('Transaction result:', result);
                    
                    if (!result) {
                        throw new Error('Transaction failed: No result returned');
                    }
                    
                    if (result.status === 'ERROR' || result.status === 'FAILED') {
                        throw new Error(`Transaction failed: ${result.error || 'Unknown error'}`);
                    }
                }

                setTradeAmount("0.0");
                setReceiveAmount("0.0");
                setAlertState({
                    isVisible: true,
                    message: 'Swap completed successfully!',
                    type: 'success'
                });

                // Award XP
                try {
                    if (userAccountId && activeAccount) {
                        await awardXP(userAccountId, activeAccount, 'FIRST_TRADE');
                    }
                } catch (error) {
                    console.error('Failed to award XP for first trade:', error);
                }
            }
        } catch (error) {
            console.error('Error in handleQuote:', error);
            setAlertState({
                isVisible: true,
                message: error instanceof Error ? error.message : 'Failed to execute trade',
                type: 'danger'
            });
        }
    };

    // Helper function to get the appropriate swap transaction
    const getSwapTransaction = async () => {
        if (!tradeToken) return { tx: null, type: null };
        const slippageBasisPoints = Math.floor(slippageTolerance * 100);

        switch (getTradeType()) {
            case 'hbarToToken':
                return await swapHbarToToken(
                    tradeAmount.toString(),
                    tradeToken.id,
                    currentPool.fee || 3000,
                    activeAccount || '',
                    Math.floor(Date.now() / 1000) + 60,
                    slippageBasisPoints,
                    tradeToken.decimals
                );
            case 'tokenToHbar':
                return await swapTokenToHbar(
                    tradeAmount.toString(),
                    currentToken.id,
                    currentPool.fee || 3000,
                    activeAccount || '',
                    Math.floor(Date.now() / 1000) + 60,
                    slippageBasisPoints,
                    currentToken.decimals
                );
            case 'tokenToToken':
                return await swapTokenToToken(
                    tradeAmount.toString(),
                    currentToken.id,
                    tradeToken.id,
                    currentPool.fee || 3000,
                    activeAccount || '',
                    Math.floor(Date.now() / 1000) + 60,
                    slippageBasisPoints,
                    currentToken.decimals,
                    tradeToken.decimals
                );
            default:
                return { tx: null, type: null };
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

    const saveThresholds = async (thresholdData: {
        type: 'stopLoss' | 'buyOrder' | 'sellOrder';
        price: number;
        cap: number;
        hederaAccountId: string;
        tokenA: string;
        tokenB: string;
        fee: number;
        slippageBasisPoints: number;
    }) => {
        if (!activeAccount || !userAccountId || !currentPool) {
            throw new Error('Missing required data');
        }

        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            console.log('Auth check:', {
                hasSession: !!session,
                error,
                accessToken: session?.access_token ? 'present' : 'missing',
                userId: session?.user?.id
            });

            if (!session) {
                throw new Error('No active session');
            }

            console.log('Making request with token:', session.access_token.substring(0, 10) + '...');
            
            const response: Response = await fetch('/api/thresholds/setThresholds', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(thresholdData),
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.log('Error response:', errorData);
                throw new Error(`API Error: ${errorData.error || response.statusText}`);
            }

            const data = await response.json();
            console.log('Threshold creation response:', data);
            
            setAlertState({
                isVisible: true,
                message: "Threshold created successfully",
                type: "success"
            });
        } catch (error: any) {
            console.error('Failed to save threshold:', error);
            setAlertState({
                isVisible: true,
                message: error.message || "Failed to create threshold",
                type: "danger"
            });
        }
    };

    const handleCurrentPool = (poolId: any) => {
        console.log('Pool selection:', {
            poolId,
            currentPools,
            selectedPool: selectedPool,
            currentPool: currentPool
        });

        if (!currentPools || !Array.isArray(currentPools)) {
            console.log('No current pools available');
            return;
        }
        
        const selectedId = Array.from(poolId)[0];
        const pool = currentPools.find((p: Pool) => p.id.toString() === selectedId);
        
        if (pool) {
            console.log('Setting selected pool:', pool);
            setCurrentPool(pool);
            setSelectedPool(pool);
            
            if (currentToken && pool.tokenA && pool.tokenB) {
                const tradeToken = pool.tokenA.id === currentToken.id ? pool.tokenB : pool.tokenA;
                setTradeToken(tradeToken);
            }
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
        if (!activeAccount) return 0;
        
        try {
            // Special case for WHBAR - check native HBAR balance instead
            if (tokenId === "0.0.15058") {
                const response = await fetch(`https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/accounts/${activeAccount}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch HBAR balance: ${response.statusText}`);
                }
                const data = await response.json();
                return data.balance.balance;
            }

            // For in-app wallets, use direct SDK query
            if (walletType === 'inApp') {
                const query = new AccountBalanceQuery()
                    .setAccountId(AccountId.fromString(activeAccount));
                const balance = await query.execute(client);
                
                // Return token balance if exists, otherwise 0
                const tokenBalance = balance.tokens?.get(TokenId.fromString(tokenId));
                return tokenBalance ? tokenBalance.toNumber() : 0;
            }

            // For extension wallets, use existing API route
            const response = await fetch(`/api/tokens/balance?accountId=${activeAccount}&tokenId=${tokenId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch token balance: ${response.statusText}`);
            }
            const data = await response.json();
            return data.balance;
        } catch (error: any) {
            console.error('Error fetching token balance:', error);
            setAlertState({
                isVisible: true,
                message: `Failed to fetch balance: ${error.message}`,
                type: 'danger'
            });
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
        console.log("Current pool listener:", currentPool);
        
        // If currentPool becomes null but we have a selectedPool, restore it
        if (!currentPool && selectedPool) {
            console.log("Restoring pool from selectedPool:", selectedPool);
            setCurrentPool(selectedPool);
        }
    }, [currentPool, selectedPool]);

    const calculateTradeAmount = async (amount: string) => {
        const activePool = currentPool || selectedPool;
        
        console.log('Starting trade calculation:', {
            inputAmount: amount,
            inputToken: {
                symbol: tradeToken?.symbol,
                decimals: tradeToken?.decimals,
                priceUsd: tradeToken?.priceUsd
            },
            outputToken: {
                symbol: currentToken?.symbol,
                decimals: currentToken?.decimals,
                priceUsd: currentToken?.priceUsd
            },
            pool: {
                id: activePool?.id,
                fee: activePool?.fee
            }
        });

        if (!activePool || !tradeToken || !currentToken || !amount || Number(amount) <= 0) {
            console.log('Trade calculation validation failed:', {
                hasPool: !!activePool,
                hasTradeToken: !!tradeToken,
                hasCurrentToken: !!currentToken,
                amount,
                isPositive: Number(amount) > 0
            });
            setReceiveAmount("0.0");
            return;
        }

        try {
            const cleanAmount = amount.replace(/[^0-9.]/g, '');
            
            const quoteAmount = await getQuoteExactInput(
                tradeToken.id,
                tradeToken.decimals,
                currentToken.id,
                cleanAmount,
                activePool.fee,
                currentToken.decimals
            );
            
            const formattedAmount = ethers.formatUnits(quoteAmount, currentToken.decimals);
            
            console.log('Quote calculation result:', {
                inputAmount: cleanAmount,
                rawQuoteAmount: quoteAmount.toString(),
                formattedQuoteAmount: formattedAmount,
                inputTokenDecimals: tradeToken.decimals,
                outputTokenDecimals: currentToken.decimals,
                estimatedUsdValue: (Number(formattedAmount) * (currentToken?.priceUsd || 0))
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

    const adjustBuyOrderPrice = (percentageChange: number) => {
        const currentPrice = parseFloat(buyOrderPrice || currentToken?.priceUsd?.toString() || "0");
        if (!isNaN(currentPrice)) {
            const newPrice = currentPrice * (1 - percentageChange);
            setBuyOrderPrice(newPrice.toFixed(8));
        }
    };

    useEffect(() => {
        if (currentToken && currentToken.priceUsd) {
            if (selectedThresholdType === 'stopLoss') {
                setStopLossPrice(currentToken.priceUsd.toString());
            } else if (selectedThresholdType === 'buyOrder') {
                setBuyOrderPrice(currentToken.priceUsd.toString());
            } else if (selectedThresholdType === 'sellOrder') {
                setSellOrderPrice(currentToken.priceUsd.toString());
            }
        }
    }, [selectedThresholdType, currentToken]);

    const filteredTokens = useMemo(() => {
        if (!tokens || !Array.isArray(tokens)) return [];
        
        return tokens
            .filter((token: Token) => 
                pools?.some((pool: any) => 
                    pool.tokenA?.id === token.id || pool.tokenB?.id === token.id
                ))
            .filter((token: Token) => 
                token.name.toLowerCase().includes(tokenSearch.toLowerCase()) ||
                token.symbol.toLowerCase().includes(tokenSearch.toLowerCase())
            );
    }, [tokens, pools, tokenSearch]);

    const getDefaultPool = (pools: Pool[]) => {
        if (!pools || !Array.isArray(pools)) return null;
        return pools.find(pool => 
            (pool.tokenA?.symbol === 'HBAR' && pool.tokenB?.symbol === 'SAUCE') ||
            (pool.tokenA?.symbol === 'SAUCE' && pool.tokenB?.symbol === 'HBAR')
        ) || null;
    };

    useEffect(() => {
        console.log('Setting default pool:', {
            hasPools: !!pools,
            poolsLength: pools?.length,
            availablePools: pools?.map((p: Pool) => ({
                id: p.id,
                tokenA: p.tokenA?.symbol,
                tokenB: p.tokenB?.symbol,
                liquidity: p.liquidity
            }))
        });

        if (pools && Array.isArray(pools)) {
            // Filter out pools with zero liquidity
            const activePools = pools.filter(pool => 
                pool.liquidity && BigInt(pool.liquidity) > BigInt(0)
            );

            console.log('Active pools with liquidity:', activePools.length);

            const defaultPool = activePools.find(pool => 
                (pool.tokenA?.symbol === 'HBAR' && pool.tokenB?.symbol === 'SAUCE') ||
                (pool.tokenA?.symbol === 'SAUCE' && pool.tokenB?.symbol === 'HBAR')
            );

            console.log('Found default pool:', defaultPool);

            if (defaultPool) {
                setSelectedPool(defaultPool);
                setCurrentPool(defaultPool);
                
                // Set the current token and trade token based on the pool
                if (defaultPool.tokenA && defaultPool.tokenB) {
                    const hbarToken = defaultPool.tokenA.symbol === 'HBAR' ? defaultPool.tokenA : defaultPool.tokenB;
                    const sauceToken = defaultPool.tokenA.symbol === 'SAUCE' ? defaultPool.tokenA : defaultPool.tokenB;
                    
                    console.log('Setting tokens:', {
                        hbarToken,
                        sauceToken
                    });

                    if (hbarToken.icon && sauceToken.icon) {
                        setCurrentToken(hbarToken as Token);
                        setTradeToken(sauceToken as Token);
                    }
                }
            } else {
                console.log('No default HBAR-SAUCE pool found');
            }
        }
    }, [pools]);

    const filteredPools = useMemo(() => {
        if (!pools || !Array.isArray(pools)) return [];
        
        return pools.filter((pool: Pool) => {
            const searchLower = poolSearch.toLowerCase();
            return pool.tokenA?.symbol.toLowerCase().includes(searchLower) ||
                   pool.tokenB?.symbol.toLowerCase().includes(searchLower) ||
                   pool.tokenA?.name.toLowerCase().includes(searchLower) ||
                   pool.tokenB?.name.toLowerCase().includes(searchLower);
        });
    }, [pools, poolSearch]);

    const PoolSelector = () => (
        <Button
            variant="bordered"
            onPress={() => setIsPoolModalOpen(true)}
            className="rounded-full px-4 py-2 border border-gray-800"
        >
            <div className="flex items-center gap-2">
                <div className="relative w-12 h-6">
                    {selectedPool?.tokenA && (
                        <Image
                            src={getTokenImageUrl(selectedPool.tokenA.icon || '')}
                            alt={selectedPool.tokenA.symbol}
                            width={24}
                            height={24}
                            className="absolute left-0 top-0"
                        />
                    )}
                    {selectedPool?.tokenB && (
                        <Image
                            src={getTokenImageUrl(selectedPool.tokenB.icon || '')}
                            alt={selectedPool.tokenB.symbol}
                            width={24}
                            height={24}
                            className="absolute left-4 top-0"
                        />
                    )}
                </div>
                <span>
                    {selectedPool 
                        ? `${selectedPool.tokenA?.symbol} / ${selectedPool.tokenB?.symbol}`
                        : "Select Pool"
                    }
                </span>
                <ChevronDownIcon className="w-4 h-4" />
            </div>
        </Button>
    );

    const SwapDirectionSelector = () => (
        <div className="flex items-center gap-2">
            <div className="flex items-center p-2 rounded-full border border-gray-800">
                <div className={`p-1 rounded-full ${currentToken?.id === selectedPool?.tokenA?.id ? 'bg-gray-800' : ''}`}>
                    <Image
                        src={getTokenImageUrl(selectedPool?.tokenA?.icon || '')}
                        alt={selectedPool?.tokenA?.symbol || ''}
                        width={24}
                        height={24}
                    />
                </div>
                <Button
                    isIconOnly
                    variant="light"
                    className="mx-2"
                    onPress={() => {
                        if (selectedPool?.tokenA && selectedPool?.tokenB) {
                            setCurrentToken(tradeToken as Token);
                            setTradeToken(currentToken);
                        }
                    }}
                >
                    <ArrowsRightLeftIcon className="w-4 h-4" />
                </Button>
                <div className={`p-1 rounded-full ${currentToken?.id === selectedPool?.tokenB?.id ? 'bg-gray-800' : ''}`}>
                    <Image
                        src={getTokenImageUrl(selectedPool?.tokenB?.icon || '')}
                        alt={selectedPool?.tokenB?.symbol || ''}
                        width={24}
                        height={24}
                    />
                </div>
            </div>
        </div>
    );

    const convertAmount = (amount: string, price: number, toUsd: boolean) => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) return "0.0";
        return toUsd ? (numAmount * price).toFixed(2) : (numAmount / price).toFixed(6);
    };

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setIsSignedIn(!!session);

            if (session?.user) {
                // Fetch user's Hedera account ID
                const { data: userData } = await supabase
                    .from('Users')
                    .select('hederaAccountId')
                    .eq('id', session.user.id)
                    .single();
                
                if (userData?.hederaAccountId) {
                    setUserAccountId(userData.hederaAccountId);
                }
            }
        };

        checkSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setIsSignedIn(!!session);
            if (session?.user) {
                const { data: userData } = await supabase
                    .from('Users')
                    .select('hederaAccountId')
                    .eq('id', session.user.id)
                    .single();
                
                if (userData?.hederaAccountId) {
                    setUserAccountId(userData.hederaAccountId);
                }
            } else {
                setUserAccountId(null);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase.auth]);

    const renderTradeButton = () => {
        const hasAccount = Boolean(account || inAppAccount);

        return (
            <Button
                color="primary"
                className="w-full"
                onPress={() => handleQuote()}
                isLoading={loading || isConnecting}
                isDisabled={!hasAccount}
            >
                {hasAccount ? 'Swap' : 'Connect Wallet to Trade'}
            </Button>
        );
    };

    const handleThresholdInputFocus = (event: React.FocusEvent) => {
        if (event.target instanceof HTMLInputElement) {
            event.target.select();
        }
    };

    const adjustThresholdPrice = (type: 'stopLoss' | 'buyOrder' | 'sellOrder', percent: number) => {
        switch(type) {
            case 'stopLoss':
                const currentStopPrice = parseFloat(stopLossPrice);
                if (!isNaN(currentStopPrice)) {
                    setStopLossPrice((currentStopPrice * (1 - percent)).toFixed(8));
                }
                break;
            case 'buyOrder':
                const currentBuyPrice = parseFloat(buyOrderPrice);
                if (!isNaN(currentBuyPrice)) {
                    setBuyOrderPrice((currentBuyPrice * (1 - percent)).toFixed(8));
                }
                break;
            case 'sellOrder':
                const currentSellPrice = parseFloat(sellOrderPrice);
                if (!isNaN(currentSellPrice)) {
                    setSellOrderPrice((currentSellPrice * (1 + percent)).toFixed(8));
                }
                break;
        }
    };

    return (    
        <div className="fixed inset-0 flex flex-col w-full pt-24">
            <div className="relative">
                <TestnetAlert />
            </div>
            <div className="w-full px-8 mb-6">
                <div className="flex justify-between items-center">
                    <PoolSelector />
                    <SwapDirectionSelector />
                </div>
            </div>
            <div className="flex flex-col lg:flex-row overflow-hidden">
                <div className="w-full lg:w-[70%] order-2 lg:order-1 lg:pr-8">
                    <div className="lg:hidden">
                        <Button
                            variant="light"
                            className="w-full mb-2 flex items-center justify-center"
                            onPress={() => setIsChartCollapsed(!isChartCollapsed)}
                        >
                            {isChartCollapsed ? (
                                <>Show Chart <ChevronDownIcon className="w-4 h-4 ml-2" /></>
                            ) : (
                                <>Hide Chart <ChevronUpIcon className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    </div>
                    <div className={`${isChartCollapsed ? 'h-0 lg:h-[calc(100vh-120px)]' : 'h-[500px] lg:h-[calc(100vh-120px)]'} transition-all duration-300`}>
                        <Tabs 
                            aria-label="section" 
                            selectedKey={selectedSection} 
                            onSelectionChange={(key) => setSelectedSection(key.toString())}
                            classNames={{
                                tabList: "ml-4"
                            }}
                        >
                            <Tab key="chart" title='Price Chart'>
                                <div className="w-full h-full">
                                    {error ? (
                                        <div className="flex justify-center items-center h-full">
                                            <p>Error loading chart data</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`transition-all duration-300 ${isChartCollapsed ? 'h-[400px]' : 'h-[600px]'}`}>
                                                <PriceChart 
                                                    data={data?.map(item => ({
                                                        time: item.timestampSeconds,
                                                        open: Number(item.openUsd),
                                                        high: Number(item.highUsd),
                                                        low: Number(item.lowUsd),
                                                        close: Number(item.closeUsd)
                                                    })) || []} 
                                                    height={isChartCollapsed ? 400 : 600}
                                                />
                                            </div>
                                            <div className="flex justify-center gap-2 mt-4">
                                                {timeRanges.map((range) => (
                                                    <Button
                                                        key={range.id}
                                                        size="sm"
                                                        variant={selectedRange === range.id ? "solid" : "flat"}
                                                        onClick={() => handleTimeRangeChange(range.value, range.id)}
                                                    >
                                                        {range.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Tab>
                            <Tab key="thresholds" title='Thresholds'>
                                <div className="h-full overflow-y-auto">
                                    <div className="pb-24">
                                        {thresholds.length > 0 ? (
                                            <Table aria-label="Active thresholds">
                                                <TableHeader>
                                                    <TableColumn>Threshold Type</TableColumn>
                                                    <TableColumn>Token A</TableColumn>
                                                    <TableColumn>Token B</TableColumn>
                                                    <TableColumn>Fee</TableColumn>
                                                    <TableColumn>Price</TableColumn>
                                                    <TableColumn>Cap</TableColumn>
                                                    <TableColumn>Status</TableColumn>
                                                    <TableColumn>Actions</TableColumn>
                                                </TableHeader>
                                                <TableBody>
                                                    {thresholds.map((threshold: Threshold) => (
                                                        <TableRow key={threshold.id}>
                                                            <TableCell>{threshold.type}</TableCell>
                                                            <TableCell>
                                                                <Image 
                                                                    src={getTokenImageUrl(getTokenIcon(threshold.tokenA))}
                                                                    alt={`Token A icon for ${threshold.tokenA}`}
                                                                    width={30}
                                                                    height={30}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <Image 
                                                                    src={getTokenImageUrl(getTokenIcon(threshold.tokenB))}
                                                                    alt={`Token B icon for ${threshold.tokenB}`}
                                                                    width={30}
                                                                    height={30}
                                                                />
                                                            </TableCell>
                                                            <TableCell>{threshold.fee / 10_000.0}%</TableCell>
                                                            <TableCell>${threshold.price}</TableCell>
                                                            <TableCell>{threshold.cap}</TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1">
                                                                    {threshold.status === 'executed' && (
                                                                        <CheckCircleIcon className="w-5 h-5 text-success" />
                                                                    )}
                                                                    {threshold.status === 'failed' && (
                                                                        <Tooltip 
                                                                            content="Transaction failed. This usually happens when there are insufficient funds in your wallet."
                                                                            className="max-w-xs"
                                                                        >
                                                                            <div className="flex items-center gap-1">
                                                                                <XCircleIcon className="w-5 h-5 text-danger" />
                                                                                <QuestionMarkCircleIcon className="w-4 h-4 text-gray-400 cursor-help" />
                                                                            </div>
                                                                        </Tooltip>
                                                                    )}
                                                                    {threshold.status === 'pending' && (
                                                                        <span className="text-default-500">Pending</span>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Button 
                                                                    onPress={() => deleteThreshold(threshold.id)}
                                                                    aria-label={`Delete ${threshold.type} threshold for ${threshold.tokenA}-${threshold.tokenB}`}
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
                                    </div>                                </div>
                            </Tab>
                        </Tabs>
                    </div>
                </div>

                <div className="w-full lg:w-[30%] order-1 lg:order-2 overflow-y-auto lg:pr-8 pb-24">
                    <Tabs 
                        aria-label="Trading Options" 
                        className="w-full"
                        classNames={{
                            tabList: "gap-4 w-full",
                            cursor: "w-full",
                            tab: "flex-1 h-12",
                            tabContent: "group-data-[selected=true]:text-white w-full text-center",
                            base: "w-full",
                            panel: "w-full"
                        }}
                    >
                        <Tab 
                            key="buy" 
                            title={
                                <div className="flex items-center justify-center w-full">
                                    Buy
                                </div>
                            }
                        >
                            <div className="w-full pb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <p>Swap Amount</p>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        onPress={() => {
                                            setIsUsdInput(!isUsdInput);
                                            if (!isUsdInput) {
                                                // Switching to USD - round to 2 decimal places
                                                const newUsdAmount = (Number(tradeAmount) * (tradeToken?.priceUsd || 0)).toFixed(2);
                                                setUsdAmount(newUsdAmount);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={isUsdInput ? "text-white" : "text-default-500"}>USD</span>
                                            <span className="text-default-500">/</span>
                                            <span className={!isUsdInput ? "text-white" : "text-default-500"}>{tradeToken?.symbol}</span>
                                        </div>
                                    </Button>
                                </div>
                                <Input
                                    type="number"
                                    value={isUsdInput ? usdAmount : tradeAmount}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        if (isUsdInput) {
                                            // Round USD to 2 decimal places
                                            const roundedUsd = Number(newValue).toFixed(2);
                                            setUsdAmount(roundedUsd);
                                            const tokenAmount = (Number(roundedUsd) / (tradeToken?.priceUsd || 1)).toString();
                                            setTradeAmount(tokenAmount);
                                            calculateTradeAmount(tokenAmount);
                                        } else {
                                            setTradeAmount(newValue);
                                            // Round USD to 2 decimal places when calculating equivalent
                                            const usdValue = (Number(newValue) * (tradeToken?.priceUsd || 0)).toFixed(2);
                                            setUsdAmount(usdValue);
                                            calculateTradeAmount(newValue);
                                        }
                                    }}
                                    onFocus={handleInputFocus}
                                    isDisabled={!tradeToken}
                                    className="text-lg"
                                    classNames={{
                                        input: "text-xl pl-4",
                                        inputWrapper: "items-center h-16",
                                        mainWrapper: "h-16",
                                    }}
                                    startContent={
                                        <div className="flex items-center mr-2">
                                            {tradeToken && <Image className="mt-1" width={40} alt="icon" src={getTokenImageUrl(tradeToken.icon)} />}
                                            <ArrowRightIcon className="w-4 h-4 mt-1 mr-2 ml-2" />
                                            <Image className="mt-1" width={40} alt="icon" src={getTokenImageUrl(currentToken.icon)} />
                                        </div>
                                    }
                                    endContent={
                                        <div className="flex items-center gap-2">
                                            <span className="text-default-400">
                                                {isUsdInput ? '$' : ''}
                                            </span>
                                            <Button 
                                                onClick={handleMaxClick} 
                                                aria-label="Set maximum amount"
                                                className="cursor-pointer" 
                                                radius="sm" 
                                                size="sm"
                                            >
                                                MAX
                                            </Button>
                                        </div>
                                    }
                                    step="0.000001"
                                />
                                <p className="text-sm text-gray-400 mt-1 text-right">
                                    {isUsdInput 
                                        ? `≈ ${tradeAmount} ${tradeToken?.symbol}`
                                        : `≈ $${(Number(tradeAmount) * (tradeToken?.priceUsd || 0)).toFixed(2)} USD`
                                    }
                                </p>

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
                                            {currentToken && <Image className="mt-1" width={30} alt="icon" src={getTokenImageUrl(currentToken.icon)} />}
                                        </div>
                                    }
                                />
                                <p className="text-sm text-gray-400 mt-1 text-right">
                                    ≈ ${(Number(receiveAmount) * (currentToken?.priceUsd || 0)).toFixed(2)} USD
                                </p>
                                <ThresholdSlippageSelector 
                                    slippage={slippageTolerance} 
                                    setSlippage={setSlippageTolerance}
                                    label="Trade Slippage"
                                />
                                {renderTradeButton()}
                            </div>
                            <ThresholdSection
                                mode="buy"
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
                                adjustStopLossPrice={(percent) => adjustThresholdPrice('stopLoss', percent)}
                                adjustSellOrderPrice={(percent) => adjustThresholdPrice('sellOrder', percent)}
                                adjustBuyOrderPrice={(percent) => adjustThresholdPrice('buyOrder', percent)}
                                hanndleMaxClickStopLoss={handleMaxClick}
                                handleMaxClickSellOrder={handleMaxClickSellOrder}
                                saveThresholds={saveThresholds}
                                resetThresholdForm={() => {
                                    setStopLossPrice(currentToken.priceUsd.toString());
                                    setSellOrderPrice(currentToken.priceUsd.toString());
                                    setBuyOrderPrice(currentToken.priceUsd.toString());
                                    setStopLossCap("0.0");
                                    setBuyOrderCap("0.0");
                                    setSellOrderCap("0.0");
                                }}
                                setIsSubmitting={setIsSubmitting}
                                setError={(error) => setAlertState({
                                    isVisible: true,
                                    message: error,
                                    type: 'danger'
                                })}
                                executeTransaction={executeTransaction}
                                activeAccount={activeAccount || ''}
                            />
                        </Tab>
                        <Tab 
                            key="sell" 
                            title={
                                <div className="flex items-center justify-center w-full">
                                    Sell
                                </div>
                            }
                        >
                            <div className="w-full pb-8">
                                <div className="flex justify-between items-center mb-4">
                                    <p>Swap Amount</p>
                                    <Button
                                        size="sm"
                                        variant="light"
                                        onPress={() => setIsUsdInput(!isUsdInput)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={isUsdInput ? "text-default-500" : "text-white"}>USD</span>
                                            <span className="text-default-500">/</span>
                                            <span className={!isUsdInput ? "text-default-500" : "text-white"}>{currentToken?.symbol}</span>
                                        </div>
                                    </Button>
                                </div>
                                <Input
                                    type="number"
                                    value={isUsdInput ? usdAmount : tradeAmount}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        if (isUsdInput) {
                                            const roundedUsd = Number(newValue).toFixed(2);
                                            setUsdAmount(roundedUsd);
                                            const tokenAmount = (Number(roundedUsd) / (currentToken?.priceUsd || 1)).toString();
                                            setTradeAmount(tokenAmount);
                                            calculateTradeAmount(tokenAmount);
                                        } else {
                                            setTradeAmount(newValue);
                                            const usdValue = (Number(newValue) * (currentToken?.priceUsd || 0)).toFixed(2);
                                            setUsdAmount(usdValue);
                                            calculateTradeAmount(newValue);
                                        }
                                    }}
                                    onFocus={handleInputFocus}
                                    isDisabled={!currentToken}
                                    className="text-lg"
                                    classNames={{
                                        input: "text-xl pl-4",
                                        inputWrapper: "items-center h-16",
                                        mainWrapper: "h-16",
                                    }}
                                    startContent={
                                        <div className="flex items-center mr-2">
                                            <Image className="mt-1" width={40} alt="icon" src={getTokenImageUrl(currentToken?.icon)} />
                                            <ArrowRightIcon className="w-4 h-4 mt-1 mr-2 ml-2" />
                                            <Image className="mt-1" width={40} alt="icon" src={getTokenImageUrl(tradeToken?.icon || '')} />
                                        </div>
                                    }
                                    endContent={
                                        <div className="flex items-center gap-2">
                                            <span className="text-default-400">
                                                {isUsdInput ? '$' : ''}
                                            </span>
                                            <Button 
                                                onClick={handleMaxClick} 
                                                aria-label="Set maximum amount"
                                                className="cursor-pointer" 
                                                radius="sm" 
                                                size="sm"
                                            >
                                                MAX
                                            </Button>
                                        </div>
                                    }
                                    step="0.000001"
                                />
                                <p className="text-sm text-gray-400 mt-1 text-right">
                                    {isUsdInput 
                                        ? `≈ ${tradeAmount} ${currentToken?.symbol}`
                                        : `≈ $${(Number(tradeAmount) * (currentToken?.priceUsd || 0)).toFixed(2)} USD`
                                    }
                                </p>

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
                                    isDisabled={currentToken ? false : true}
                                    startContent={
                                        <div className="flex items-center mr-2">
                                            {tradeToken && <Image className="mt-1" width={30} alt="icon" src={getTokenImageUrl(tradeToken.icon)} />}
                                        </div>
                                    }
                                />
                                <p className="text-sm text-gray-400 mt-1 text-right">
                                    ≈ ${(Number(receiveAmount) * (tradeToken?.priceUsd || 0)).toFixed(2)} USD
                                </p>
                                <ThresholdSlippageSelector 
                                    slippage={slippageTolerance} 
                                    setSlippage={setSlippageTolerance}
                                    label="Trade Slippage"
                                />
                                {renderTradeButton()}
                            </div>
                            <ThresholdSection
                                mode="sell"
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
                                adjustStopLossPrice={(percent) => adjustThresholdPrice('stopLoss', percent)}
                                adjustSellOrderPrice={(percent) => adjustThresholdPrice('sellOrder', percent)}
                                adjustBuyOrderPrice={(percent) => adjustThresholdPrice('buyOrder', percent)}
                                hanndleMaxClickStopLoss={handleMaxClick}
                                handleMaxClickSellOrder={handleMaxClickSellOrder}
                                saveThresholds={saveThresholds}
                                resetThresholdForm={() => {
                                    setStopLossPrice(currentToken.priceUsd.toString());
                                    setSellOrderPrice(currentToken.priceUsd.toString());
                                    setBuyOrderPrice(currentToken.priceUsd.toString());
                                    setStopLossCap("0.0");
                                    setBuyOrderCap("0.0");
                                    setSellOrderCap("0.0");
                                }}
                                setIsSubmitting={setIsSubmitting}
                                setError={(error) => setAlertState({
                                    isVisible: true,
                                    message: error,
                                    type: 'danger'
                                })}
                                executeTransaction={executeTransaction}
                                activeAccount={activeAccount || ''}
                            />
                        </Tab>
                    </Tabs>
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

            <Modal 
                isOpen={isTokenModalOpen} 
                onClose={() => {
                    setIsTokenModalOpen(false);
                    setTokenSearch("");
                }}
                scrollBehavior="inside"
                size="lg"
                classNames={{
                    base: "bg-black border border-gray-800 rounded-lg",
                    header: "border-b border-gray-800",
                    body: "max-h-[400px] overflow-y-auto",
                    closeButton: "hover:bg-gray-800 active:bg-gray-700"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">Select Token</ModalHeader>
                    <ModalBody>
                        <Input
                            placeholder="Search tokens..."
                            value={tokenSearch}
                            onChange={(e) => setTokenSearch(e.target.value)}
                            startContent={<SearchIcon className="w-4 h-4 text-default-400" />}
                            className="mb-4"
                            classNames={{
                                input: "bg-black",
                                inputWrapper: "bg-black border border-gray-800 hover:bg-gray-900"
                            }}
                        />
                        <div className="flex flex-col gap-2">
                            {filteredTokens.map((token: Token) => (
                                <Button
                                    key={token.id}
                                    variant="light"
                                    className="w-full justify-start p-4 hover:bg-gray-900"
                                    onPress={() => {
                                        selectCurrentToken(token.id);
                                        setIsTokenModalOpen(false);
                                        setTokenSearch("");
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <Image
                                            width={32}
                                            height={32}
                                            alt={token.symbol}
                                            src={getTokenImageUrl(token.icon)}
                                        />
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold">{token.symbol}</span>
                                            <span className="text-sm text-default-500">{token.name}</span>
                                        </div>
                                        <div className="ml-auto">
                                            <span className="text-default-500">
                                                ${formatPrice(token.priceUsd)}
                                            </span>
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>

            <Modal 
                isOpen={isPoolModalOpen} 
                onClose={() => {
                    setIsPoolModalOpen(false);
                    setPoolSearch("");
                }}
                scrollBehavior="inside"
                size="lg"
                classNames={{
                    base: "bg-black border border-gray-800 rounded-lg",
                    header: "border-b border-gray-800",
                    body: "max-h-[400px] overflow-y-auto",
                    closeButton: "hover:bg-gray-800 active:bg-gray-700"
                }}
            >
                <ModalContent>
                    <ModalHeader className="flex flex-col gap-1">Select Pool</ModalHeader>
                    <ModalBody>
                        <Input
                            placeholder="Search pools..."
                            value={poolSearch}
                            onChange={(e) => setPoolSearch(e.target.value)}
                            startContent={<SearchIcon className="w-4 h-4 text-default-400" />}
                            className="mb-4"
                            classNames={{
                                input: "bg-black",
                                inputWrapper: "bg-black border border-gray-800 hover:bg-gray-900"
                            }}
                        />
                        <div className="flex flex-col gap-2">
                            {filteredPools.map((pool: Pool) => (
                                <Button
                                    key={pool.id}
                                    variant="light"
                                    className="w-full justify-start p-4 hover:bg-gray-900"
                                    onPress={() => {
                                        setSelectedPool(pool);
                                        setCurrentPool(pool);
                                        if (pool.tokenA && pool.tokenB) {
                                            setCurrentToken(pool.tokenA as Token);
                                            setTradeToken(pool.tokenB as Token);
                                        }
                                        setIsPoolModalOpen(false);
                                        setPoolSearch("");
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-6">
                                            <Image
                                                src={getTokenImageUrl(pool.tokenA?.icon || '')}
                                                alt={pool.tokenA?.symbol}
                                                width={24}
                                                height={24}
                                                className="absolute left-0 top-0"
                                            />
                                            <Image
                                                src={getTokenImageUrl(pool.tokenB?.icon || '')}
                                                alt={pool.tokenB?.symbol}
                                                width={24}
                                                height={24}
                                                className="absolute left-4 top-0"
                                            />
                                        </div>
                                        <div className="flex flex-col items-start">
                                            <span className="font-semibold">
                                                {pool.tokenA?.symbol} / {pool.tokenB?.symbol}
                                            </span>
                                            <span className="text-sm text-default-500">
                                                Fee: {pool.fee / 10_000.0}%
                                            </span>
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    </ModalBody>
                </ModalContent>
            </Modal>

            <PasswordModal
                context={passwordModalContext}
                password={password}
                setPassword={setPassword}
                onSubmit={handlePasswordSubmit}
                setContext={setPasswordModalContext}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
