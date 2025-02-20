'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/app/hooks/useSupabase';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { encrypt } from '@/lib/utils/encryption';
import { persistSession } from '@/utils/supabase/session';
import { passwordSchema } from '@/lib/utils/validation';
import { EyeIcon, EyeSlashIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { VT323 } from "next/font/google";
import { storePrivateKey } from '@/lib/utils/keyStorage';

const vt323 = VT323({ weight: "400", subsets: ["latin"] });

export default function CreateWalletForm() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [password, setPassword] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    
    const router = useRouter();
    const { supabase } = useSupabase();
    const { inAppAccount, setInAppAccount } = useInAppWallet();

    const handleCreateWallet = async () => {
        // Validate password
        const validationResult = passwordSchema.safeParse(password);
        if (!validationResult.success) {
            setPasswordError('Password must be at least 12 characters');
            return;
        }

        if (password !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError(null);
        setPasswordError(null);
        
        try {
            // Get current session
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                console.log('No session, redirecting to login...');
                router.push('/auth/login');
                return;
            }

            // Make request with session token
            const response = await fetch('/api/wallet/create-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ password }),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create account');
            }

            const { accountId, privateKey } = await response.json();
            console.log('Account created successfully:', { accountId });

            // Store private key in IndexedDB
            try {
                const stored = await storePrivateKey(session.user.id, privateKey, password);
                if (!stored) {
                    throw new Error('Failed to store private key securely');
                }

                // Get fresh session with updated metadata
                const { data: { session: updatedSession } } = await supabase.auth.getSession();
                if (updatedSession) {
                    setPrivateKey(privateKey);
                    setInAppAccount(accountId);
                    persistSession(
                        null,
                        updatedSession,
                        true,
                        null,
                        accountId
                    );

                    const { error: updateError } = await supabase.auth.updateUser({
                        data: {
                            hasStoredPrivateKey: true,
                            hederaAccountId: accountId
                        }
                    });
                }
            } catch (error) {
                await supabase.auth.updateUser({
                    data: {
                        hasStoredPrivateKey: false
                    }
                });
                console.error('Storage error:', error);
                throw new Error('Failed to store private key securely');
            }
        } catch (err: any) {
            if (err.message.includes('401') || err.message.includes('authenticated')) {
                router.push('/auth/login');
                return;
            }
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (privateKey) {
            await navigator.clipboard.writeText(privateKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (inAppAccount && privateKey) {
        return (
            <div className="w-[450px] bg-black rounded-lg border border-gray-800 shadow-xl p-8 mx-4">
                <h1 className={`text-4xl font-bold mb-6 text-emerald-400 text-center ${vt323.className}`}>
                    Wallet Created!
                </h1>
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Your Hedera Account ID:
                    </label>
                    <div className="font-mono bg-gray-800 border border-gray-700 p-2 rounded text-gray-100">
                        {inAppAccount}
                    </div>
                </div>
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                            Your Private Key:
                        </label>
                        <button
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className="text-gray-400 hover:text-gray-200 transition-colors"
                        >
                            {showPrivateKey ? (
                                <EyeSlashIcon className="h-5 w-5" />
                            ) : (
                                <EyeIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                    <div className="relative">
                        <div className="font-mono bg-gray-800 border border-gray-700 p-2 rounded break-all text-gray-100">
                            {showPrivateKey ? privateKey : '•'.repeat(64)}
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className="absolute right-2 top-2 text-gray-400 hover:text-gray-200 transition-colors"
                        >
                            {copied ? (
                                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                            ) : (
                                <ClipboardIcon className="h-5 w-5" />
                            )}
                        </button>
                    </div>
                </div>
                <div className="bg-yellow-900/50 p-4 rounded-lg mb-6 border border-yellow-800">
                    <p className="text-yellow-200 text-sm">
                        Important: Save your private key in a secure location. 
                        You will need it to access your account. It cannot be recovered if lost.
                    </p>
                </div>
                <button
                    onClick={() => router.push('/wallet')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0159E0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Continue to Wallet
                </button>
            </div>
        );
    }

    return (
        <div className="w-[450px] bg-black rounded-lg border border-gray-800 shadow-xl p-8 mx-4">
            <h1 className={`text-4xl font-bold mb-6 text-white text-center ${vt323.className}`}>
                Create Your Wallet
            </h1>
            
            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-800 text-red-200 rounded">
                    {error}
                </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleCreateWallet(); }} className="space-y-6">
                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                        Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setPasswordError(null);
                        }}
                        required
                        className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setPasswordError(null);
                        }}
                        required
                        className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                    />
                </div>
                
                {passwordError && (
                    <div className="p-3 bg-red-900/50 border border-red-800 text-red-200 rounded">
                        {passwordError}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0159E0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isLoading ? 'Creating Wallet...' : 'Create Hedera Account'}
                </button>
            </form>
        </div>
    );
} 