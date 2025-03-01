'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { AccountId, AccountBalanceQuery } from "@hashgraph/sdk";
import TestnetAlert from '@/app/components/TestnetAlert';

interface TokenBalance {
    hbar: string;
    sauce: string;
    clxy: string;
}

export default function EthDenverMintPage() {
    const [amounts, setAmounts] = useState<TokenBalance>({
        hbar: '',
        sauce: '',
        clxy: ''
    });
    const [balances, setBalances] = useState<TokenBalance>({
        hbar: '0',
        sauce: '0',
        clxy: '0'
    });
    const [estimatedLynx, setEstimatedLynx] = useState<string>('0');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const { supabase } = useSupabase();
    
    // For EthDenver demo, we'll use a predefined account
    const demoAccountId = process.env.NEXT_PUBLIC_DEMO_ACCOUNT_ID || '0.0.12345';
    
    useEffect(() => {
        fetchBalances();
    }, []);

    useEffect(() => {
        // Calculate LYNX output based on equal 1:1:1 ratio
        if (amounts.hbar) {
            const inputAmount = parseFloat(amounts.hbar);
            setEstimatedLynx(inputAmount.toString());
            
            // Update other token amounts to maintain 1:1:1 ratio
            setAmounts(prev => ({
                hbar: prev.hbar,
                sauce: prev.hbar,
                clxy: prev.hbar
            }));
        }
    }, [amounts.hbar]);

    const fetchBalances = async () => {
        try {
            const accountId = AccountId.fromString(demoAccountId);
            
            // Fetch token balances from Mirror Node API
            const mirrorNodeUrl = process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet'
                ? 'https://mainnet-public.mirrornode.hedera.com'
                : 'https://testnet.mirrornode.hedera.com';
                
            const sauceTokenId = process.env.NEXT_PUBLIC_SAUCE_TOKEN_ID || '';
            const clxyTokenId = process.env.NEXT_PUBLIC_CLXY_TOKEN_ID || '';
            
            const response = await fetch(`${mirrorNodeUrl}/api/v1/accounts/${accountId.toString()}`);
            const accountData = await response.json();
            
            const hbarBalance = (accountData.balance.balance / 1e8).toFixed(8);
            
            // Find token balances
            let sauceBalance = '0';
            let clxyBalance = '0';
            
            if (accountData.tokens) {
                const sauceToken = accountData.tokens.find((t: any) => t.token_id === sauceTokenId);
                const clxyToken = accountData.tokens.find((t: any) => t.token_id === clxyTokenId);
                
                if (sauceToken) sauceBalance = (sauceToken.balance / 1e8).toFixed(8);
                if (clxyToken) clxyBalance = (clxyToken.balance / 1e8).toFixed(8);
            }
            
            setBalances({
                hbar: hbarBalance,
                sauce: sauceBalance,
                clxy: clxyBalance
            });
        } catch (error: any) {
            console.error('Error fetching balances:', error);
        }
    };

    const handleAmountChange = (token: keyof TokenBalance, value: string) => {
        // When any token amount changes, update all tokens to maintain 1:1:1 ratio
        setAmounts({
            hbar: value,
            sauce: value,
            clxy: value
        });
    };

    const handleMint = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            setError(null);
            setSuccess(null);

            // Use the demo endpoint for EthDenver
            const response = await fetch('/api/mint-with-operator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hbarAmount: amounts.hbar,
                    sauceAmount: amounts.sauce,
                    clxyAmount: amounts.clxy
                })
            });

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Mint failed');
            }
            
            // Show success message
            setSuccess(`Mint successful! Transaction ID: ${data.transactionId}`);
            await fetchBalances();
            setAmounts({ hbar: '', sauce: '', clxy: '' });

        } catch (error: any) {
            console.error('Mint error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full mx-auto">
            <TestnetAlert />
            
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Mint LYNX Index Token</h1>
                    <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
                        EthDenver Demo
                    </div>
                </div>
                
                {success && (
                    <div className="mb-6 p-3 bg-green-900/50 border border-green-700 rounded text-green-200">
                        {success}
                    </div>
                )}
                
                <div className="bg-gray-900 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl">Token Balances</h2>
                        <button 
                            onClick={fetchBalances}
                            className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                        >
                            Refresh
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-800 p-3 rounded">
                            <div className="text-gray-400 text-sm">HBAR</div>
                            <div className="text-xl font-semibold">{balances.hbar}</div>
                        </div>
                        <div className="bg-gray-800 p-3 rounded">
                            <div className="text-gray-400 text-sm">SAUCE</div>
                            <div className="text-xl font-semibold">{balances.sauce}</div>
                        </div>
                        <div className="bg-gray-800 p-3 rounded">
                            <div className="text-gray-400 text-sm">CLXY</div>
                            <div className="text-xl font-semibold">{balances.clxy}</div>
                        </div>
                    </div>
                </div>
                
                <form onSubmit={handleMint} className="bg-gray-900 rounded-lg p-6 mb-6">
                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-1">HBAR Amount</label>
                        <input
                            type="number"
                            value={amounts.hbar}
                            onChange={(e) => handleAmountChange('hbar', e.target.value)}
                            placeholder="Enter HBAR amount"
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                            min="0"
                            step="0.000001"
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-1">SAUCE Amount</label>
                        <input
                            type="number"
                            value={amounts.sauce}
                            onChange={(e) => handleAmountChange('sauce', e.target.value)}
                            placeholder="Enter SAUCE amount"
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                            min="0"
                            step="0.000001"
                        />
                    </div>
                    
                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-1">CLXY Amount</label>
                        <input
                            type="number"
                            value={amounts.clxy}
                            onChange={(e) => handleAmountChange('clxy', e.target.value)}
                            placeholder="Enter CLXY amount"
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2"
                            min="0"
                            step="0.000001"
                        />
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg mb-6">
                        <div className="text-gray-400 text-sm mb-1">Estimated LYNX Output</div>
                        <div className="text-2xl font-bold">{estimatedLynx} LYNX</div>
                    </div>
                    
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                        disabled={isLoading || !estimatedLynx || parseFloat(estimatedLynx) <= 0}
                    >
                        {isLoading ? 'Processing...' : 'Mint LYNX'}
                    </button>
                    
                    {error && (
                        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded text-red-200">
                            {error}
                        </div>
                    )}
                </form>
                
                <div className="bg-gray-900 rounded-lg p-6">
                    <h2 className="text-xl mb-4">How LYNX Minting Works</h2>
                    <div className="text-gray-300 space-y-3">
                        <p>
                            LYNX is minted using an equal 1:1:1 ratio of HBAR, SAUCE, and CLXY tokens.
                        </p>
                        <p>
                            For every 1 HBAR, 1 SAUCE, and 1 CLXY deposited, you receive 1 LYNX token.
                        </p>
                        <p>
                            This balanced approach ensures that LYNX maintains stable backing from all three assets.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
} 