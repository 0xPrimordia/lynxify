'use client';

import { useState, useEffect } from 'react';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { Button, Input } from "@nextui-org/react";
import { EyeIcon, EyeSlashIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function ExportPage() {
    const { loadWallet, inAppAccount } = useInAppWallet();
    const [showKey, setShowKey] = useState(false);
    const [privateKey, setPrivateKey] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        
        try {
            const decryptedKey = await loadWallet(password);
            if (!decryptedKey) throw new Error('Failed to load wallet');
            setPrivateKey(decryptedKey.toString());
            setShowKey(true);
            
            // Auto-hide after 5 minutes
            setTimeout(() => {
                setShowKey(false);
                setPrivateKey(null);
            }, 5 * 60 * 1000);
        } catch (err) {
            setError('Invalid password');
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

    // Clear key when leaving page
    useEffect(() => {
        return () => {
            setPrivateKey(null);
            setShowKey(false);
        };
    }, []);

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-white mb-6">Export Wallet</h1>
            
            {!showKey ? (
                <div className="bg-gray-800 rounded-lg p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-white mb-2">Account ID</h2>
                        <div className="bg-gray-900 p-3 rounded text-gray-300 font-mono">
                            {inAppAccount}
                        </div>
                    </div>

                    <form onSubmit={handleExport} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Enter Wallet Password
                            </label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your wallet password"
                                className="w-full"
                            />
                        </div>
                        
                        {error && (
                            <div className="text-red-500 text-sm">{error}</div>
                        )}

                        <Button
                            type="submit"
                            color="primary"
                            isLoading={isLoading}
                            className="w-full"
                        >
                            Export Private Key
                        </Button>
                    </form>
                </div>
            ) : (
                <div className="bg-gray-800 rounded-lg p-6">
                    <div className="bg-yellow-900/50 p-4 rounded-lg mb-6 border border-yellow-800">
                        <p className="text-yellow-200 text-sm">
                            Warning: Your private key grants full access to your account. 
                            Never share it with anyone or enter it on untrusted websites.
                        </p>
                    </div>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-300">
                                Your Private Key:
                            </label>
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="text-gray-400 hover:text-gray-200 transition-colors"
                            >
                                {showKey ? (
                                    <EyeSlashIcon className="h-5 w-5" />
                                ) : (
                                    <EyeIcon className="h-5 w-5" />
                                )}
                            </button>
                        </div>
                        <div className="relative">
                            <div className="font-mono bg-gray-900 border border-gray-700 p-3 rounded break-all text-gray-100">
                                {showKey ? privateKey : '•'.repeat(64)}
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
                </div>
            )}
        </div>
    );
} 