import { useState } from 'react';
import { supabase } from '@/utils/supabase';
import { passwordSchema, emailSchema } from '@/lib/utils/validation';

interface InAppWalletFormProps {
    campaignId?: string | null;
}

export const InAppWalletForm = ({ campaignId }: InAppWalletFormProps) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryAfter, setRetryAfter] = useState<number | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (retryAfter) return;
        setError(null);
        
        // Validate email
        if (!emailSchema.safeParse(email).success) {
            setError('Invalid email address');
            return;
        }

        // Validate password
        if (!passwordSchema.safeParse(password).success) {
            setError('Password must be at least 12 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setIsConnecting(true);
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/verify-email`,
                    data: {
                        campaign_id: campaignId // Store campaign ID in user metadata
                    }
                }
            });

            if (signUpError) throw signUpError;
            setVerificationSent(true);
        } catch (err: any) {
            console.error('Error:', err);
            setError(err.message || 'An error occurred');
            if (err.status === 429) { // Rate limit error
                setRetryAfter(60); // Default to 60s if not provided
            }
        } finally {
            setIsConnecting(false);
        }
    };

    if (verificationSent) {
        return (
            <div className="text-center">
                <h2 data-testid="verification-heading">Check your email</h2>
                <p>We&apos;ve sent you a verification link. Please check your email to continue.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full" data-testid="wallet-form">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    Email
                </label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    Password
                </label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                />
            </div>
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
                    Confirm Password
                </label>
                <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                />
            </div>
            
            {error && (
                <div role="alert" data-testid="error-message" className="mb-4 p-3 bg-red-900/50 border border-red-800 text-red-200 rounded">
                    {error}
                    {retryAfter && (
                        <span data-testid="retry-countdown"> Try again in {retryAfter}s</span>
                    )}
                </div>
            )}
            
            <button
                type="submit"
                disabled={isConnecting}
                data-testid="submit-button"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0159E0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isConnecting ? 'Creating Account...' : 'Create Account'}
            </button>
        </form>
    );
}; 