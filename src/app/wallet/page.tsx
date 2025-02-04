'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useRouter } from 'next/navigation';
import { AccountId, Client, AccountBalanceQuery } from '@hashgraph/sdk';

interface TokenBalance {
    token: string;
    symbol: string;
    balance: string;
    value_usd: number;
}

const client = Client.forTestnet(); // or forMainnet() depending on your environment

export default function WalletPortfolio() {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [balances, setBalances] = useState<TokenBalance[]>([]);
    const [totalValue, setTotalValue] = useState<number>(0);
    const { supabase } = useSupabase();
    const router = useRouter();

    useEffect(() => {
        async function fetchBalances() {
            try {
                // Get user session
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push('/auth/login');
                    return;
                }

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

                // Get HBAR balance using SDK method
                const hbarBalance = balance.hbars.toString();
                const cleanBalance = hbarBalance.replace('ℏ', '').trim();
                console.log('HBAR Balance:', cleanBalance, typeof cleanBalance);

                // TODO: Fetch HBAR price from an API
                const hbarPrice = 0.07; // Placeholder price
                console.log('HBAR Price:', hbarPrice, typeof hbarPrice);
                
                const hbarValue = Number(cleanBalance) * hbarPrice;
                console.log('HBAR Value:', hbarValue, typeof hbarValue);

                setBalances([
                    {
                        token: 'Hedera',
                        symbol: 'HBAR',
                        balance: hbarBalance,
                        value_usd: hbarValue
                    }
                ]);

                setTotalValue(hbarValue);
                
                // TODO: Add token balances when available
                if (balance.tokens && balance.tokens.size > 0) {
                    // Handle token balances
                    console.log('Token balances:', balance.tokens);
                }

            } catch (err: any) {
                console.error('Error fetching balances:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchBalances();
    }, [supabase, router]);

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

            {/* Portfolio Summary */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 mb-6 p-6">
                <h2 className="text-lg font-medium text-white mb-4">Portfolio Value</h2>
                <div className="text-3xl font-bold text-white">
                    ${totalValue.toLocaleString()}
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
                                                {balance.token} ({balance.symbol})
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