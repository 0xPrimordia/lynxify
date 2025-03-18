'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { useWalletContext } from '@/app/hooks/useWallet';
import { AccountId, TokenId, Client, AccountBalanceQuery } from "@hashgraph/sdk";
import { Alert } from "@nextui-org/react";
import { VT323 } from "next/font/google";
import TestnetAlert from '@/app/components/TestnetAlert';
import Image from 'next/image';
import { handleInAppTransaction, handleInAppPasswordSubmit } from '@/app/lib/transactions/inAppWallet';
import { handleExtensionTransaction } from '@/app/lib/transactions/extensionWallet';
import { usePasswordModal } from '@/app/hooks/usePasswordModal';
import { useSaucerSwapContext } from '@/app/hooks/useTokens';
import { getTokenImageUrl } from '@/app/lib/utils/tokens';
import { PasswordModal } from '@/app/components/PasswordModal';

const vt323 = VT323({ weight: "400", subsets: ["latin"] });

interface TokenBalance {
    hbar: string;
    sauce: string;
    clxy: string;
    lynx: string;
}

const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

// Initial token ratios for LYNX composition
// These values represent how many tokens are needed to mint 1 LYNX
const TOKEN_RATIOS = {
    HBAR: 10,    // 10 HBAR (largest market cap, main network token)
    SAUCE: 5,    // 5 SAUCE (established DeFi token)
    CLXY: 2      // 2 CLXY (newer ecosystem token)
};

// Move TokenCard outside of MintPage
const TokenCard = React.memo(({ 
    symbol, 
    balance, 
    amount, 
    onChange, 
    iconUrl,
    isOutput = false,
    usdValue = null 
}: {
    symbol: string;
    balance: string;
    amount: string;
    onChange?: (value: string) => void;
    iconUrl: string;
    isOutput?: boolean;
    usdValue?: number | null;
}) => {
    console.log(`TokenCard rendering for ${symbol}`, { amount, balance });
    
    const [imageError, setImageError] = useState(false);

    const TokenImage = () => {
        if (imageError) {
            return (
                <div 
                    className="rounded-full bg-gray-700 flex items-center justify-center"
                    style={{ width: 32, height: 32 }}
                >
                    <span className="text-white font-medium text-sm">
                        {symbol.substring(0, 2)}
                    </span>
                </div>
            );
        }
        
        return (
            <Image
                src={iconUrl}
                alt={symbol}
                width={32}
                height={32}
                className="rounded-full"
                onError={() => setImageError(true)}
            />
        );
    };

    return (
        <div className={`bg-gray-800 rounded-lg p-6 ${isOutput ? 'border-2 border-blue-500' : ''}`}>
            <div className="flex items-center mb-4">
                <TokenImage />
                <span className="ml-3 text-lg font-medium">{symbol}</span>
                {isOutput && (
                    <span className="ml-auto text-sm text-blue-400">Expected Output</span>
                )}
            </div>
            
            <div className="space-y-4">
                {!isOutput && (
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Balance</label>
                        <div className="text-xl font-semibold">{balance}</div>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm text-gray-400 mb-1">
                        {isOutput ? 'Expected Output' : 'Amount'}
                    </label>
                    {onChange ? (
                        <input
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(e) => onChange(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            placeholder={`Enter ${symbol} amount`}
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white"
                        />
                    ) : (
                        <div className="text-xl font-semibold text-blue-400">
                            {amount || '0'}
                        </div>
                    )}
                </div>

                {usdValue !== null && (
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">USD Value</label>
                        <div className="text-sm text-gray-300">
                            ${usdValue.toFixed(2)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

// Mock token prices - move outside component to prevent recreation
const tokenPrices = {
    HBAR: 0.07,
    SAUCE: 0.15,
    CLXY: 0.25
};

export default function MintPage() {
    console.log('MintPage rendering');

    const [amounts, setAmounts] = useState<TokenBalance>(() => ({
        hbar: '',
        sauce: '',
        clxy: '',
        lynx: ''
    }));
    const [balances, setBalances] = useState<TokenBalance>({
        hbar: '0',
        sauce: '0',
        clxy: '0',
        lynx: '0'
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { supabase } = useSupabase();
    const { inAppAccount, signTransaction, walletType } = useInAppWallet();
    const { account: extensionAccount, signAndExecuteTransaction } = useWalletContext();
    const { 
        password, 
        setPassword, 
        passwordModalContext, 
        setPasswordModalContext,
        resetPasswordModal 
    } = usePasswordModal();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { tokens } = useSaucerSwapContext();

    const activeAccount = inAppAccount || extensionAccount;
    
    useEffect(() => {
        if (activeAccount) {
            fetchBalances();
        }
    }, [activeAccount]);

    const handleAmountChange = React.useCallback((token: keyof TokenBalance, value: string) => {
        console.log('handleAmountChange called:', { token, value });
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setAmounts(prev => {
                const newAmounts = { ...prev };
                if (token === 'hbar') {
                    // Calculate other token amounts based on ratios
                    const lynxAmount = parseFloat(value) / TOKEN_RATIOS.HBAR; // How many LYNX this would mint
                    newAmounts.hbar = value;
                    newAmounts.sauce = (lynxAmount * TOKEN_RATIOS.SAUCE).toString();
                    newAmounts.clxy = (lynxAmount * TOKEN_RATIOS.CLXY).toString();
                    newAmounts.lynx = lynxAmount.toString();
                } else {
                    newAmounts[token] = value;
                }
                return newAmounts;
            });
        }
    }, []);

    const fetchBalances = async () => {
        if (!activeAccount) return;

        try {
            const accountId = AccountId.fromString(activeAccount);
            
            // Query account balance using SDK
            const query = new AccountBalanceQuery()
                .setAccountId(accountId);
            const balance = await query.execute(client);

            // Get HBAR balance
            const hbarBalance = balance.hbars.toString().replace('ℏ', '').trim();
            
            let sauceBalance = '0';
            let clxyBalance = '0';
            let lynxBalance = '0';
            
            // Get token balances
            if (balance.tokens && balance.tokens.size > 0) {
                console.log('Available tokens:', Array.from(balance.tokens._map.entries()));
                
                try {
                    // Hardcoded token IDs as fallback
                    const SAUCE_TOKEN_ID = process.env.NEXT_PUBLIC_SAUCE_TOKEN_ID || '1183558';
                    const CLXY_TOKEN_ID = process.env.NEXT_PUBLIC_CLXY_TOKEN_ID || '5365';
                    
                    // Helper function to get token decimals
                    const getTokenDecimals = async (tokenId: string): Promise<number> => {
                        try {
                            const response = await fetch(
                                `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/tokens/${tokenId}`
                            );
                            const tokenData = await response.json();
                            console.log(`Token ${tokenId} data:`, tokenData);
                            return tokenData.decimals || 8;
                        } catch (error) {
                            console.error(`Error fetching decimals for token ${tokenId}:`, error);
                            return 8; // Default to 8 decimals if fetch fails
                        }
                    };

                    // Get SAUCE balance
                    const sauceId = TokenId.fromString(`0.0.${SAUCE_TOKEN_ID}`);
                    const sauceAmount = balance.tokens.get(sauceId);
                    if (sauceAmount) {
                        const sauceDecimals = await getTokenDecimals(SAUCE_TOKEN_ID);
                        sauceBalance = (Number(sauceAmount) / Math.pow(10, sauceDecimals)).toFixed(sauceDecimals);
                    }
                    
                    // Get CLXY balance
                    const clxyId = TokenId.fromString(`0.0.${CLXY_TOKEN_ID}`);
                    const clxyAmount = balance.tokens.get(clxyId);
                    if (clxyAmount) {
                        const clxyDecimals = await getTokenDecimals(CLXY_TOKEN_ID);
                        clxyBalance = (Number(clxyAmount) / Math.pow(10, clxyDecimals)).toFixed(clxyDecimals);
                    }
                    
                    // Get LYNX balance if token ID exists
                    if (process.env.NEXT_PUBLIC_LYNX_TOKEN_ID) {
                        const lynxId = TokenId.fromString(`0.0.${process.env.NEXT_PUBLIC_LYNX_TOKEN_ID}`);
                        const lynxAmount = balance.tokens.get(lynxId);
                        if (lynxAmount) {
                            const lynxDecimals = await getTokenDecimals(process.env.NEXT_PUBLIC_LYNX_TOKEN_ID);
                            lynxBalance = (Number(lynxAmount) / Math.pow(10, lynxDecimals)).toFixed(lynxDecimals);
                        }
                    }
                    
                    console.log('Token balances:', {
                        SAUCE: sauceBalance,
                        CLXY: clxyBalance,
                        LYNX: lynxBalance
                    });
                } catch (tokenError) {
                    console.error('Error parsing token IDs:', tokenError);
                    console.log('Token IDs:', {
                        SAUCE: process.env.NEXT_PUBLIC_SAUCE_TOKEN_ID,
                        CLXY: process.env.NEXT_PUBLIC_CLXY_TOKEN_ID,
                        LYNX: process.env.NEXT_PUBLIC_LYNX_TOKEN_ID
                    });
                }
            }
            
            setBalances({
                hbar: hbarBalance,
                sauce: sauceBalance,
                clxy: clxyBalance,
                lynx: lynxBalance
            });
        } catch (error: any) {
            console.error('Error fetching balances:', error);
            setError('Failed to fetch balances');
        }
    };

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeAccount) {
            setError('Please connect your wallet first');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            // Validate amounts before proceeding
            const lynxAmount = parseFloat(amounts.lynx);
            if (isNaN(lynxAmount) || lynxAmount <= 0) {
                throw new Error('Invalid LYNX amount');
            }

            // Check user has sufficient balances
            if (parseFloat(amounts.hbar) > parseFloat(balances.hbar)) {
                throw new Error('Insufficient HBAR balance');
            }
            if (parseFloat(amounts.sauce) > parseFloat(balances.sauce)) {
                throw new Error('Insufficient SAUCE balance');
            }
            if (parseFloat(amounts.clxy) > parseFloat(balances.clxy)) {
                throw new Error('Insufficient CLXY balance');
            }

            // Get transaction from backend
            const response = await fetch('/api/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hbarAmount: amounts.hbar,
                    sauceAmount: amounts.sauce,
                    clxyAmount: amounts.clxy,
                    lynxAmount: amounts.lynx,
                    accountId: activeAccount
                })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to prepare mint transaction');
            }

            // Execute transaction with connected wallet
            let result;
            if (walletType === 'inApp') {
                result = await handleInAppTransaction(
                    data.transaction,
                    signTransaction,
                    (context) => {
                        if (typeof context === 'function') {
                            setPasswordModalContext(context);
                        } else {
                            setPasswordModalContext({
                                isOpen: true,
                                description: `Mint ${amounts.lynx} LYNX using:\n• ${amounts.hbar} HBAR\n• ${amounts.sauce} SAUCE\n• ${amounts.clxy} CLXY`,
                                transaction: data.transaction,
                                transactionPromise: context.transactionPromise
                            });
                        }
                    }
                );
            } else if (walletType === 'extension') {
                result = await handleExtensionTransaction(
                    data.transaction,
                    extensionAccount!,
                    signAndExecuteTransaction
                );
            } else {
                throw new Error('No wallet client available');
            }
            
            if (result.status === 'SUCCESS') {
                setSuccess(`Successfully minted ${amounts.lynx} LYNX! Transaction ID: ${result.transactionId}`);
                await fetchBalances(); // Refresh balances
                setAmounts({ hbar: '', sauce: '', clxy: '', lynx: '' }); // Reset form
            } else if (result.status === 'REJECTED') {
                throw new Error('Transaction rejected by user');
            } else {
                throw new Error(result.error || 'Transaction failed');
            }

        } catch (error: any) {
            console.error('Mint error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
            setIsSubmitting(false);
        }
    };

    const getTokenIcon = React.useCallback((symbol: string): string => {
        if (tokens && Array.isArray(tokens)) {
            const token = tokens.find((t) => t.symbol === symbol);
            if (token && token.icon) {
                return getTokenImageUrl(token.icon);
            }
        }
        
        const tokenMap: Record<string, string> = {
            'HBAR': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.15058.png',
            'SAUCE': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1055.png',
            'CLXY': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1130.png',
            'LYNX': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/lynx.png'
        };
        
        return tokenMap[symbol] || '/images/tokens/default.png';
    }, [tokens]);

    const getUsdValue = React.useCallback((symbol: string, amount: string): number => {
        const price = tokenPrices[symbol as keyof typeof tokenPrices] || 0;
        return parseFloat(amount || '0') * price;
    }, []);

    // Memoize the onChange handlers for each token
    const handleHbarChange = React.useCallback((value: string) => {
        handleAmountChange('hbar', value);
    }, [handleAmountChange]);

    const handlePasswordSubmit = async () => {
        if (!passwordModalContext.transaction || !passwordModalContext.transactionPromise) return;
        
        setIsSubmitting(true);
        try {
            const result = await handleInAppPasswordSubmit(
                passwordModalContext.transaction,
                password,
                signTransaction,
                setPasswordModalContext
            );
            
            if (result.status === 'SUCCESS') {
                passwordModalContext.transactionPromise.resolve(result);
                resetPasswordModal();
            } else {
                throw new Error(result.error || 'Transaction failed');
            }
        } catch (error: any) {
            setError(error.message === 'OperationError' ? 'Invalid password. Please try again.' : error.message);
            if (error.message === 'OperationError') {
                setIsSubmitting(false);
                return;
            }
            resetPasswordModal();
        }
        
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen text-white">
            <TestnetAlert />
            
            <div className="container mx-auto px-4 py-8">
                <h1 className={`text-2xl mb-8 ${vt323.className}`}>Mint LYNX Index Token</h1>
                
                {(success || error) && (
                    <Alert 
                        className="mb-6" 
                        color={success ? "success" : "danger"}
                    >
                        {success || error}
                    </Alert>
                )}
                
                {!activeAccount ? (
                    <div className="bg-gray-800 rounded-lg p-6 text-center">
                        <p className="text-gray-400">Please connect your wallet to mint LYNX tokens</p>
                    </div>
                ) : (
                    <form onSubmit={handleMint}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <TokenCard
                                symbol="HBAR"
                                balance={balances.hbar}
                                amount={amounts.hbar}
                                onChange={handleHbarChange}
                                iconUrl={getTokenIcon('HBAR')}
                                usdValue={getUsdValue('HBAR', amounts.hbar)}
                            />
                            <TokenCard
                                symbol="SAUCE"
                                balance={balances.sauce}
                                amount={amounts.sauce}
                                iconUrl={getTokenIcon('SAUCE')}
                                usdValue={getUsdValue('SAUCE', amounts.sauce)}
                            />
                            <TokenCard
                                symbol="CLXY"
                                balance={balances.clxy}
                                amount={amounts.clxy}
                                iconUrl={getTokenIcon('CLXY')}
                                usdValue={getUsdValue('CLXY', amounts.clxy)}
                            />
                            <TokenCard
                                symbol="LYNX"
                                balance=""
                                amount={amounts.lynx}
                                iconUrl={getTokenIcon('LYNX')}
                                isOutput={true}
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="bg-[#0159E0] hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                disabled={isLoading || isSubmitting || !amounts.hbar || parseFloat(amounts.hbar) <= 0}
                            >
                                {isLoading ? 'Processing...' : 
                                 isSubmitting ? 'Awaiting Approval...' : 
                                 'Mint LYNX'}
                            </button>
                        </div>
                    </form>
                )}
                
                <div className="mt-8 bg-gray-900 rounded-lg p-6">
                    <h2 className={`text-xl mb-4 ${vt323.className}`}>How LYNX Minting Works</h2>
                    <div className="text-gray-300 space-y-3">
                        <p>
                            LYNX is minted using a weighted ratio of HBAR, SAUCE, and CLXY tokens.
                        </p>
                        <p>
                            Current ratio to mint 1 LYNX:
                        </p>
                        <ul className="list-disc pl-6">
                            <li>{TOKEN_RATIOS.HBAR} HBAR</li>
                            <li>{TOKEN_RATIOS.SAUCE} SAUCE</li>
                            <li>{TOKEN_RATIOS.CLXY} CLXY</li>
                        </ul>
                        <p>
                            This weighted approach ensures balanced representation of the Hedera ecosystem.
                        </p>
                    </div>
                </div>
            </div>

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