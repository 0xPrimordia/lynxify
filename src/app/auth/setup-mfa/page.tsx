'use client';

import { useEffect, useState } from 'react';
import { useWalletContext } from '@/app/hooks/useWallet';
import { useSupabase } from '@/app/hooks/useSupabase';
import { QRCodeSVG } from 'qrcode.react';

export default function SetupMFA() {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { supabase } = useSupabase();
    const { userId } = useWalletContext();
    const [challengeId, setChallengeId] = useState<string | null>(null);

    useEffect(() => {
        async function setupMFA() {
            try {
                const { data, error } = await supabase.auth.mfa.enroll({
                    factorType: 'totp'
                });

                if (error) throw error;
                if (data?.totp?.qr_code) {
                    setQrCode(data.totp.qr_code);
                    setChallengeId(data.id);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        if (userId) {
            setupMFA();
        }
    }, [userId, supabase]);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!challengeId) return;
        
        setError(null);
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.mfa.verify({
                factorId: 'totp',
                challengeId,
                code: verifyCode
            });

            if (error) throw error;

            // Redirect to dashboard after successful MFA setup
            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6">Set Up Two-Factor Authentication</h1>
            
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
                    {error}
                </div>
            )}

            {qrCode && (
                <div className="mb-6">
                    <p className="mb-4">
                        Scan this QR code with your authenticator app (like Google Authenticator)
                    </p>
                    <div className="flex justify-center">
                        <QRCodeSVG value={qrCode} size={200} />
                    </div>
                </div>
            )}

            <form onSubmit={handleVerify} className="space-y-4">
                <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                        Enter Verification Code
                    </label>
                    <input
                        type="text"
                        id="code"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Enter 6-digit code"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isLoading ? 'Verifying...' : 'Verify & Complete Setup'}
                </button>
            </form>
        </div>
    );
} 