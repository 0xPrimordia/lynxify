'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';

interface Transaction {
    transaction_id: string;
    consensus_timestamp: string;
    name: string;
    result: string;
    charged_fees: string;
    transfers: Array<{
        account: string;
        amount: number;
        token_id?: string;
    }>;
    type: string;
}

export default function TransactionHistory() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { supabase } = useSupabase();

    useEffect(() => {
        async function fetchTransactions() {
            try {
                // Get user's Hedera account ID
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const { data: userData, error: userError } = await supabase
                    .from('Users')
                    .select('hederaAccountId')
                    .eq('id', session.user.id)
                    .single();

                if (userError) throw userError;
                if (!userData?.hederaAccountId) return;

                // Fetch from Mirror Node
                const response = await fetch(
                    `https://${process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? '' : 'testnet.'}mirrornode.hedera.com/api/v1/transactions?account.id=${userData.hederaAccountId}&limit=100&order=desc`
                );

                if (!response.ok) throw new Error('Failed to fetch transactions');
                
                const data = await response.json();
                setTransactions(data.transactions);
            } catch (err: any) {
                console.error('Error fetching transactions:', err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchTransactions();
    }, [supabase]);

    if (isLoading) {
        return (
            <div className="text-center text-white">
                <p>Loading transactions...</p>
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
        <div className="bg-gray-900 rounded-lg border border-gray-800">
            <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-white mb-4">Transaction History</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-800">
                        <thead>
                            <tr>
                                <th className="px-6 py-3 bg-gray-800 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 bg-gray-800 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 bg-gray-800 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 bg-gray-800 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {transactions.map((tx) => (
                                <tr key={tx.transaction_id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {new Date(Number(tx.consensus_timestamp) * 1000).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                        {tx.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">
                                        {tx.charged_fees} HBAR
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            tx.result === 'SUCCESS' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                        }`}>
                                            {tx.result}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
} 