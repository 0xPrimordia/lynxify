import { useState } from 'react';
import { useWalletContext } from '@/app/hooks/useWallet';
import { handleApiResponse, formatRetryMessage, ApiError } from '@/lib/utils/errorHandling';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { passwordSchema, emailSchema } from '@/lib/utils/validation';
import { z } from 'zod';

export const InAppWalletForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const { handleConnectInAppWallet, error, isConnecting, setIsConnecting, setError } = useWalletContext();
    const [retryAfter, setRetryAfter] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (retryAfter) return;
        
        try {
            // Validate email and password
            const validEmail = emailSchema.parse(email);
            const validPassword = passwordSchema.parse(password);
            
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }

            setIsConnecting(true);
            setError(null);
            
            await handleConnectInAppWallet(validEmail, validPassword);
            setVerificationSent(true);

        } catch (err) {
            if (err instanceof z.ZodError) {
                setError(err.errors[0].message);
                return;
            }
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
            setIsConnecting(false);
        }
    };

    if (verificationSent) {
        return (
            <div className="text-center">
                <h3 className="text-lg font-medium">Check your email</h3>
                <p className="mt-2 text-sm text-gray-500">
                    We've sent you a verification link. Please check your email to continue.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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
                    minLength={8}
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
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
            </div>

            <button
                type="submit"
                disabled={isConnecting || !!retryAfter}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0159E0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
                {isConnecting ? 'Creating Account...' : retryAfter ? `Try again in ${retryAfter}s` : 'Create Account'}
            </button>
        </form>
    );
}; 