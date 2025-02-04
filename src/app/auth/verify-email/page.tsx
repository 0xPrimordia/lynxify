'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function VerifyEmail() {
    const [error] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const errorParam = searchParams.get('error');
    const router = useRouter();

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            {errorParam ? (
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 text-red-600">Verification Failed</h1>
                    <p className="text-red-500">{errorParam}</p>
                </div>
            ) : (
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4 text-green-600">Email Verified!</h1>
                    <p className="text-gray-600 mb-6">
                        Your email has been successfully verified. Please log in to continue.
                    </p>
                    <button
                        onClick={() => router.push('/auth/login')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        Log In
                    </button>
                </div>
            )}
        </div>
    );
} 