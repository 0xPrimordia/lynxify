'use client';

import { useState } from 'react';
import { handleApiResponse, formatRetryMessage, ApiError } from '@/lib/utils/errorHandling';

export const ResetPasswordForm = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [retryAfter, setRetryAfter] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (retryAfter) return;
        
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            await handleApiResponse(response);
            setMessage('Check your email for password reset instructions');
            setEmail('');
            
        } catch (err: any) {
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
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Reset Password</h2>
            
            {message && (
                <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
                    {message}
                </div>
            )}
            
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {retryAfter && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded">
                    {formatRetryMessage(retryAfter)}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !!retryAfter}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isLoading ? 'Sending...' : retryAfter ? 'Too Many Attempts' : 'Send Reset Instructions'}
                </button>
            </form>
        </div>
    );
}; 