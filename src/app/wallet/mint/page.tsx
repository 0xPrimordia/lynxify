'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { AccountId, AccountBalanceQuery } from "@hashgraph/sdk";
import { handleInAppTransaction, handleInAppPasswordSubmit } from '@/app/lib/transactions/inAppWallet';
import { PasswordModalContext } from '@/app/types';
import { usePasswordModal } from '@/app/hooks/usePasswordModal';
import { PasswordModal } from '@/app/components/PasswordModal';
import TestnetAlert from '@/app/components/TestnetAlert';

interface TokenBalance {
    hbar: string;
    sauce: string;
    clxy: string;
}

export default function MintPage() {
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
    const { supabase } = useSupabase();
    const { inAppAccount, signTransaction } = useInAppWallet();
    const { 
        password, 
        setPassword, 
        passwordModalContext,
        setPasswordModalContext,
        resetPasswordModal 
    } = usePasswordModal();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.user_metadata?.hederaAccountId) return;

            const accountId = AccountId.fromString(session.user.user_metadata.hederaAccountId);
            
            // Fetch HBAR balance
            const query = new AccountBalanceQuery()
                .setAccountId(accountId);
            
            // TODO: Fetch token balances using Mirror Node API
            // For prototype, setting mock values
            setBalances({
                hbar: '100',
                sauce: '1000',
                clxy: '1000'
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
        e.preventDefault(); // Prevent default form submission
        try {
            setIsLoading(true);
            setError(null);

            if (!inAppAccount) {
                throw new Error('Wallet not connected');
            }

            const response = await fetch('/api/mint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    hbarAmount: amounts.hbar,
                    sauceAmount: amounts.sauce,
                    clxyAmount: amounts.clxy,
                    accountId: inAppAccount
                })
            });

            const { transaction, error } = await response.json();
            if (error) throw new Error(error);

            const result = await handleInAppTransaction(
                transaction,
                signTransaction,
                setPasswordModalContext
            );

            if ((result as any)?.status === 'SUCCESS') {
                await fetchBalances();
                setAmounts({ hbar: '', sauce: '', clxy: '' });
            } else {
                setError('Transaction failed. Please try again.');
            }

        } catch (error: any) {
            console.error('Mint error:', error);
            setError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

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
                setAmounts({ hbar: '', sauce: '', clxy: '' });
                resetPasswordModal();
            } else {
                throw new Error(result.error || 'Transaction failed');
            }
        } catch (error: any) {
            setError(error.message === 'OperationError' ? 'Invalid password. Please try again.' : error.message);
            if (error.message === 'OperationError') {
                setIsSubmitting(false);
                setIsLoading(false);
                return;
            }
            resetPasswordModal();
        }
        
        setIsSubmitting(false);
        setIsLoading(false);
    };

    return (
        <div className="w-full mx-auto">
            <TestnetAlert />
            
            <PasswordModal
                context={passwordModalContext}
                password={password}
                setPassword={setPassword}
                onSubmit={handlePasswordSubmit}
                setContext={setPasswordModalContext}
                isSubmitting={isSubmitting}
            />
            
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Mint LYNX Index Token</h1>
                
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
                        disabled={isSubmitting || !estimatedLynx || parseFloat(estimatedLynx) <= 0}
                    >
                        {isSubmitting ? 'Processing...' : 'Mint LYNX'}
                    </button>
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