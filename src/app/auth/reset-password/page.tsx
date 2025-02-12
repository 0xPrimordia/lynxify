'use client';

import { useState } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useRouter } from 'next/navigation';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';

export default function ResetPassword() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { supabase } = useSupabase();
    const router = useRouter();
    const { recoverKey } = useInAppWallet();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        try {
            // First update the password
            const { data: { user }, error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            if (!user) throw new Error('No user found');

            // Then recover the wallet key
            try {
                await recoverKey(user.id);
            } catch (keyError: any) {
                // If key recovery fails, we should still allow password reset
                console.error('Key recovery failed:', keyError);
                setError('Password updated but wallet recovery failed. Please contact support.');
                return;
            }

            // Success - redirect to dashboard
            router.push('/dashboard?message=Password updated and wallet recovered successfully');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6">Set New Password</h1>
            
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        New Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                        minLength={8}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                        This will also recover your wallet access
                    </p>
                </div>

                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        required
                        minLength={8}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isLoading ? 'Updating...' : 'Update Password & Recover Wallet'}
                </button>
            </form>
        </div>
    );
} 