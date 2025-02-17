'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSupabase } from '@/app/hooks/useSupabase';
import { EyeIcon, EyeSlashIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { encrypt } from '@/lib/utils/encryption';
import { persistSession } from '@/utils/supabase/session';
import { passwordSchema } from '@/lib/utils/validation';

function VerifyEmailPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [copied, setCopied] = useState(false);
    const [password, setPassword] = useState<string>('');
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    
    const searchParams = useSearchParams();
    const router = useRouter();
    const errorParam = searchParams.get('error');
    const { supabase } = useSupabase();
    const { inAppAccount, setInAppAccount } = useInAppWallet();
    const [isSessionReady, setIsSessionReady] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                console.log('No session, redirecting to login...');
                router.push('/auth/login');
                return;
            }

            if (session.user.email_confirmed_at) {
                console.log('Session authenticated and email confirmed');
                setIsSessionReady(true);
            } else {
                console.log('Email not confirmed');
                setError('Email not confirmed');
            }
        };

        checkSession();
    }, [router, supabase.auth]);

    useEffect(() => {
        return () => {
            // Cleanup function to clear private key when component unmounts
            setPrivateKey(null);
        };
    }, []);

    const handleCreateWallet = async () => {
        if (!isSessionReady) return;
        
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

            if (session.user.email_confirmed_at) {
                console.log('Session authenticated and email confirmed');
                setIsSessionReady(true);
            } else {
                console.log('Email not confirmed');
                setError('Email not confirmed');
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

            console.log('Create account response:', {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create account');
            }

            const { accountId, privateKey } = await response.json();
            console.log('Account created successfully:', { accountId });

            // Store private key in IndexedDB
            try {
                // Encrypt private key before starting transaction
                const encryptedKey = await encrypt(privateKey, password);
                
                const db = await window.indexedDB.open('HederaWallet', 1);
                
                db.onerror = () => {
                    throw new Error('Failed to open IndexedDB');
                };

                db.onupgradeneeded = (event) => {
                    const db = (event.target as IDBOpenDBRequest).result;
                    if (!db.objectStoreNames.contains('keys')) {
                        db.createObjectStore('keys', { keyPath: 'userId' });
                    }
                };

                db.onsuccess = async (event) => {
                    const database = (event.target as IDBOpenDBRequest).result;
                    const transaction = database.transaction(['keys'], 'readwrite');
                    const store = transaction.objectStore('keys');

                    const request = store.put({
                        userId: session.user.id,
                        encryptedKey
                    });
                    
                    request.onsuccess = async () => {
                        // Get fresh session with updated metadata
                        const { data: { session: updatedSession } } = await supabase.auth.getSession();
                        if (updatedSession) {
                            setPrivateKey(privateKey);
                            setInAppAccount(accountId);
                            // Persist the updated session with accountId
                            persistSession(
                                null, // No wallet connect session
                                updatedSession,
                                true, // is in-app wallet
                                null, // Don't store private key in session
                                accountId // Add this parameter
                            );

                            // After successful private key storage in IndexedDB
                            const { error: updateError } = await supabase.auth.updateUser({
                                data: {
                                    hasStoredPrivateKey: true
                                }
                            });
                        }
                    };
                    
                    request.onerror = () => {
                        throw new Error('Failed to store key in IndexedDB');
                    };
                };
            } catch (dbError) {
                // If encryption or DB setup fails, ensure flag is set to false
                await supabase.auth.updateUser({
                    data: {
                        hasStoredPrivateKey: false
                    }
                });
                console.error('IndexedDB error:', dbError);
                throw new Error('Failed to store private key securely');
            } finally {
                setIsLoading(false);
            }
        } catch (err: any) {
            if (err.message.includes('401') || err.message.includes('authenticated')) {
                router.push('/auth/login');
                return;
            }
            setError(err.message);
        }
    };

    const copyToClipboard = async () => {
        if (privateKey) {
            await navigator.clipboard.writeText(privateKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isSessionReady) {
        console.log('Session not ready');
        return <div className="text-center p-4">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-black flex items-start justify-center pt-20">
            <div className="w-[450px] bg-black rounded-lg border border-gray-800 shadow-xl p-8 mx-4">
                {errorParam ? (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4 text-red-400">Verification Failed</h1>
                        <p className="text-red-300">{errorParam}</p>
                    </div>
                ) : !inAppAccount ? (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4 text-emerald-400">Email Verified!</h1>
                        <p className="text-gray-300 mb-6">
                            Your email has been verified. Create your password to secure your Hedera account.
                        </p>
                        <div className="space-y-4 mb-6">
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
                                    className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                                />
                            </div>
                            {passwordError && (
                                <div className="p-3 bg-red-900/50 border border-red-800 text-red-200 rounded">
                                    {passwordError}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleCreateWallet}
                            disabled={!isSessionReady || isLoading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0159E0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Creating Wallet...' : 'Create Hedera Account'}
                        </button>
                        {error && (
                            <div className="mt-4 p-3 bg-red-900/50 border border-red-800 text-red-200 rounded">
                                {error}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4 text-emerald-400">Wallet Created!</h1>
                        <div className="mb-6">
                            <p className="text-gray-300 mb-2">Your Hedera Account ID:</p>
                            <p className="font-mono bg-gray-700 p-2 rounded text-gray-100">{inAppAccount}</p>
                        </div>
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-gray-300">Your Private Key:</p>
                                <button
                                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                                    className="text-primary hover:text-primary/80 transition-colors"
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
                            onClick={() => router.push('/wallet')}
                            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 
                                transition-colors w-full"
                        >
                            Continue to Wallet
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailWrapper() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailPage />
        </Suspense>
    );
} 