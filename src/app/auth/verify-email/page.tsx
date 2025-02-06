'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/app/hooks/useSupabase';
import { EyeIcon, EyeSlashIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function VerifyEmail() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [accountId, setAccountId] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    
    const searchParams = useSearchParams();
    const router = useRouter();
    const { supabase } = useSupabase();
    const errorParam = searchParams.get('error');

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setHasSession(!!session);
        };
        checkSession();
    }, [supabase]);

    const handleCreateWallet = async () => {
        if (!hasSession) {
            setError('Please sign in to create a wallet');
            return;
        }

        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                credentials: 'include'  // Important: include cookies
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create wallet');
            }
            
            const { accountId: newAccountId, privateKey: newPrivateKey } = await response.json();
            setAccountId(newAccountId);
            setPrivateKey(newPrivateKey);
        } catch (err: any) {
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

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-gray-800 rounded-lg shadow-xl border border-gray-700">
            {errorParam ? (
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 text-red-400">Verification Failed</h1>
                    <p className="text-red-300">{errorParam}</p>
                </div>
            ) : !accountId ? (
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 text-emerald-400">Email Verified!</h1>
                    <p className="text-gray-300 mb-6">
                        Your email has been verified. Click below to create your Hedera account.
                    </p>
                    <button
                        onClick={handleCreateWallet}
                        disabled={isLoading || !hasSession}
                        className={`px-4 py-2 bg-[#0159E0] text-white rounded hover:bg-blue-700 
                            disabled:bg-gray-600 disabled:text-gray-300 w-full transition-colors
                            ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        {isLoading ? 'Creating Wallet...' : 'Create Hedera Account'}
                    </button>
                    {error && (
                        <p className="mt-4 text-red-400">{error}</p>
                    )}
                </div>
            ) : (
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 text-emerald-400">Wallet Created!</h1>
                    <div className="mb-6">
                        <p className="text-gray-300 mb-2">Your Hedera Account ID:</p>
                        <p className="font-mono bg-gray-700 p-2 rounded text-gray-100">{accountId}</p>
                    </div>
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-gray-300">Your Private Key:</p>
                            <button
                                onClick={() => setShowPrivateKey(!showPrivateKey)}
                                className="text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                                {showPrivateKey ? (
                                    <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                    <EyeIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        <div className="relative">
                            <div className="font-mono bg-gray-700 p-2 rounded break-all text-gray-100">
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
                    <div className="bg-yellow-900 p-4 rounded-lg mb-6 border border-yellow-700">
                        <p className="text-yellow-200 text-sm">
                            Important: Save your private key in a secure location. 
                            You will need it to access your account. It cannot be recovered if lost.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/auth/login')}
                        className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 
                            transition-colors w-full"
                    >
                        Continue to Login
                    </button>
                </div>
            )}
        </div>
    );
} 