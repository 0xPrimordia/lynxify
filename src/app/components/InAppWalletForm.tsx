import { useState } from 'react';
import { useWalletContext } from '@/app/hooks/useWallet';
import { handleApiResponse, formatRetryMessage, ApiError } from '@/lib/utils/errorHandling';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';

export const InAppWalletForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const { handleConnectInAppWallet, error, isConnecting, setIsConnecting, setError } = useWalletContext();
    console.log('Context values:', { handleConnectInAppWallet, error, isConnecting });
    const [retryAfter, setRetryAfter] = useState<number | null>(null);
    const { inAppAccount } = useInAppWallet();
    console.log('InAppWallet values:', { inAppAccount });

    const handleSubmit = async (e: React.FormEvent) => {
        console.log('Form submitted with values:', { email, password, confirmPassword, inAppAccount });
        e.preventDefault();
        if (retryAfter) {
            console.log('Blocked by retry timer');
            return;
        }
        
        if (password !== confirmPassword) {
            console.log('Passwords do not match');
            alert('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            console.log('Password too short');
            alert('Password must be at least 8 characters');
            return;
        }

        try {
            console.log('Setting connecting state and calling handleConnectInAppWallet');
            setIsConnecting(true);
            setError(null);

            if (!inAppAccount) {
                console.log('No inAppAccount available');
                throw new Error('No account ID available');
            }

            console.log('Calling handleConnectInAppWallet with:', { email, inAppAccount });
            await handleConnectInAppWallet(email, password, inAppAccount);
            console.log('handleConnectInAppWallet completed successfully');
            setVerificationSent(true);

        } catch (err: any) {
            console.error('Error in submit handler:', err);
            const apiError = err as ApiError;
            setError(apiError.error);
            if (apiError.retryAfter) {
                setRetryAfter(apiError.retryAfter);
                const timer = setInterval(() => {
                    setRetryAfter((current) => {
                        if (current === null || current <= 1) {
                            clearInterval(timer);
                            return null;
                        }
                        return current - 1;
                    });
                }, 1000);
            }
        } finally {
            console.log('Setting connecting state to false');
            setIsConnecting(false);
        }
    };

    console.log('Rendering form, isConnecting:', isConnecting);

    if (verificationSent) {
        return (
            <div className="text-center space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Verify Your Email</h3>
                <div className="text-sm text-gray-500">
                    <p>We've sent a verification link to:</p>
                    <p className="font-medium">{email}</p>
                    <p className="mt-2">Please check your email and click the verification link to continue.</p>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                    <p>After verification, you'll be prompted to set up two-factor authentication for additional security.</p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {retryAfter && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded">
                    {formatRetryMessage(retryAfter)}
                </div>
            )}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                </label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                </label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                </label>
                <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
            </div>
            {error && (
                <div className="text-red-600 text-sm">{error}</div>
            )}
            <button
                type="submit"
                disabled={isConnecting || !!retryAfter}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {isConnecting ? 'Creating Wallet...' : retryAfter ? 'Too Many Attempts' : 'Create Wallet'}
            </button>
        </form>
    );
}; 