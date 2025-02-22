'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useRouter } from 'next/navigation';
import { AccountId, Client, AccountBalanceQuery } from '@hashgraph/sdk';
import { useSaucerSwapContext } from "../hooks/useTokens";
import { Token } from "@/app/types";
import { Image } from "@nextui-org/react";
import { getTokenImageUrl } from '@/app/lib/utils/tokens';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';

interface TokenBalance {
    token: string;
    symbol: string;
    balance: string;
    value_usd: number;
    icon?: string;
}

const client = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet();

export default function WalletPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [balances, setBalances] = useState<TokenBalance[]>([]);
    const [totalValue, setTotalValue] = useState<number>(0);
    const { supabase } = useSupabase();
    const router = useRouter();
    const { tokens } = useSaucerSwapContext();
    const { inAppAccount } = useInAppWallet();

    useEffect(() => {
        // Check session immediately
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/auth/login');
                return;
            }
        };
        checkSession();
    }, [supabase, router]);

    useEffect(() => {
        async function fetchBalances() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return; // Skip fetching if no session

                // Get user's Hedera account ID from Supabase
                const { data: userData, error: userError } = await supabase
                    .from('Users')
                    .select('hederaAccountId')
                    .eq('id', session.user.id)
                    .single();

                if (userError) throw userError;
                if (!userData?.hederaAccountId) throw new Error('No Hedera account found');

                // Query account balance
                const accountId = AccountId.fromString(userData.hederaAccountId);
                const query = new AccountBalanceQuery()
                    .setAccountId(accountId);
                const balance = await query.execute(client);

                // Set HBAR balance first
                const hbarBalance = balance.hbars.toString();
                const cleanBalance = hbarBalance.replace('ℏ', '').trim();
                const hbarPrice = 0.07; // Placeholder price
                const hbarValue = Number(cleanBalance) * hbarPrice;

                // Clear existing balances and set HBAR first
                const whbarToken = tokens?.find((t: Token) => t.id === "0.0.15058");
                setBalances([{
                    token: 'Hedera',
                    symbol: 'HBAR',
                    balance: hbarBalance,
                    value_usd: hbarValue,
                    icon: whbarToken?.icon || '/images/tokens/WHBAR.png'
                }]);

                // Add token balances
                if (balance.tokens && balance.tokens.size > 0) {
                    console.log('Initial tokens:', Array.from(balance.tokens._map.entries()));
                    
                    const tokenPromises = Array.from(balance.tokens._map.entries()).map(async ([tokenId, amount]) => {
                        console.log('Processing token:', tokenId.toString(), amount.toString());
                        
                        // Skip HBAR token since we already added it
                        if (tokenId.toString() === '0.0.15058') {
                            console.log('Skipping WHBAR token');
                            return null;
                        }

                        try {
                            const response = await fetch(
                                `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK}.mirrornode.hedera.com/api/v1/tokens/${tokenId}`
                            );
                            const tokenData = await response.json();
                            console.log('Token data:', tokenData);
                            
                            const tokenBalance = Number(amount) / Math.pow(10, tokenData.decimals);
                            console.log('Calculated balance:', tokenBalance);
                            
                            const saucerToken = tokens?.find((t: Token) => t.id === tokenId.toString());
                            let valueUsd = 0;
                            try {
                                if (saucerToken?.priceUsd) {
                                    const priceUsd = Number(saucerToken.priceUsd);
                                    valueUsd = tokenBalance * priceUsd;
                                    console.log('Token:', tokenId.toString());
                                    console.log('Balance:', tokenBalance);
                                    console.log('Price USD:', priceUsd);
                                    console.log('Total value:', valueUsd);
                                }
                            } catch (priceErr) {
                                console.warn('Price fetch error:', priceErr);
                            }

                            return {
                                token: tokenData.name || tokenId.toString(),
                                symbol: tokenData.symbol || 'TOKEN',
                                balance: tokenBalance.toString(),
                                value_usd: valueUsd,
                                icon: saucerToken?.icon || tokenData.icon || ''
                            };
                        } catch (err) {
                            console.error('Error processing token:', tokenId.toString(), err);
                            return null;
                        }
                    });

                    const tokenBalances = (await Promise.all(tokenPromises)).filter(balance => balance !== null);
                    
                    // Replace the entire balances array instead of appending
                    setBalances(currentBalances => {
                        // Only update if we still have the initial HBAR balance
                        if (currentBalances.length === 1 && currentBalances[0].symbol === 'HBAR') {
                            return [...currentBalances, ...tokenBalances];
                        }
                        return currentBalances;
                    });
                }

            } catch (err: any) {
                console.error('Error fetching balances:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchBalances();
    }, [supabase, router, tokens]);

    useEffect(() => {
        // Calculate total value whenever balances change
        const total = balances.reduce((sum, token) => sum + token.value_usd, 0);
        setTotalValue(total);
    }, [balances]);

    if (isLoading) {
        return (
            <div className="text-center text-white">
                <p>Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center text-red-400">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Portfolio</h1>
                <p className="mt-2 text-sm text-gray-400">
                    View and manage your token holdings
                </p>
            </div>

            {/* Portfolio Summary with Account ID */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 mb-6 p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-lg font-medium text-white mb-4">Portfolio Value</h2>
                        <div className="text-3xl font-bold text-white">
                            ${totalValue.toLocaleString()}
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-medium text-white mb-4">Account ID</h2>
                        <div className="font-mono text-gray-300">
                            {inAppAccount || 'Loading...'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Token List */}
            <div className="bg-gray-900 rounded-lg border border-gray-800">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-white mb-4">Token Balances</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-800">
                            <thead>
                                <tr>
                                    <th className="px-6 py-3 bg-gray-800 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                        Token
                                    </th>
                                    <th className="px-6 py-3 bg-gray-800 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                        Balance
                                    </th>
                                    <th className="px-6 py-3 bg-gray-800 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                        Value (USD)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {balances.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-400">
                                            No tokens found in wallet
                                        </td>
                                    </tr>
                                ) : (
                                    balances.map((balance, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                                <div className="flex items-center">
                                                    <Image
                                                        width={30}
                                                        height={30}
                                                        alt={balance.symbol}
                                                        src={getTokenImageUrl(balance.icon ?? '')}
                                                        className="mr-4"
                                                    />
                                                    <span className="text-gray-400 mx-2 inline-block">{balance.symbol}</span>
                                                    {balance.token}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                                                {balance.balance}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                                                ${balance.value_usd.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
} 