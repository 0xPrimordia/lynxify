'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { AccountId, AccountBalanceQuery } from "@hashgraph/sdk";
import { handleInAppTransaction, handleInAppPasswordSubmit } from '@/app/lib/transactions/inAppWallet';
import { PasswordModalContext } from '@/app/types';
import { usePasswordModal } from '@/app/hooks/usePasswordModal';
import { PasswordModal } from '@/app/components/PasswordModal';

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
        setPasswordModalContext: setPasswordModalContextFromPasswordModal,
        resetPasswordModal 
    } = usePasswordModal();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchBalances();
    }, []);

    useEffect(() => {
        // Simple 1:1:1 ratio for prototype
        const minAmount = Math.min(
            parseFloat(amounts.hbar) || 0,
            parseFloat(amounts.sauce) || 0,
            parseFloat(amounts.clxy) || 0
        );
        setEstimatedLynx(minAmount.toString());
    }, [amounts]);

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
        // Set all token amounts to the same value
        setAmounts({
            hbar: value,
            sauce: value,
            clxy: value
        });
    };

    const handleMint = async () => {
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
                setPasswordModalContextFromPasswordModal
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
                setPasswordModalContextFromPasswordModal
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
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-8">Mint LYNX</h1>
            
            <div className="bg-gray-900 rounded-lg p-6">
                {Object.entries(amounts).map(([token, value]) => (
                    <div key={token} className="mb-6">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            {token.toUpperCase()} Amount (Balance: {balances[token as keyof TokenBalance]})
                        </label>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => handleAmountChange(token as keyof TokenBalance, e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white"
                            placeholder="0.0"
                            min="0"
                        />
                    </div>
                ))}

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Estimated LYNX
                    </label>
                    <div className="w-full bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-white">
                        {estimatedLynx}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 text-red-500 text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleMint}
                    disabled={isLoading || !estimatedLynx || parseFloat(estimatedLynx) === 0}
                    className={`w-full py-2 px-4 rounded-md ${
                        isLoading || !estimatedLynx || parseFloat(estimatedLynx) === 0
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'
                    } text-white font-medium`}
                >
                    {isLoading ? 'Minting...' : 'Mint LYNX'}
                </button>
            </div>

            <PasswordModal
                context={passwordModalContext}
                setContext={setPasswordModalContextFromPasswordModal}
                onSubmit={handlePasswordSubmit}
                password={password}
                setPassword={setPassword}
                isSubmitting={isSubmitting}
            />
        </div>
    );
} 