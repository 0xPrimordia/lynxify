'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/app/hooks/useSupabase';
import { VT323 } from "next/font/google";
const vt323 = VT323({ weight: "400", subsets: ["latin"] })

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { supabase } = useSupabase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Successful login - redirect to wallet instead of dashboard
            router.push('/wallet');

        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Failed to log in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-start justify-center pt-20">
            <div className="w-[450px] bg-black rounded-lg border border-gray-800 shadow-xl p-8 mx-4">
                <h1 className={`text-4xl font-bold mb-6 text-white text-center ${vt323.className}`}>Log In</h1>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-800 text-red-200 rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
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
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="mt-1 block w-full bg-gray-800 border border-gray-700 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0159E0] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isLoading ? 'Logging in...' : 'Log In'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <a href="/auth/reset-password" className="text-sm text-blue-400 hover:text-blue-300">
                        Forgot your password?
                    </a>
                </div>
            </div>
        </div>
    );
} 