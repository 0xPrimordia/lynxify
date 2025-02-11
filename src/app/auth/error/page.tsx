'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AuthError() {
    const searchParams = useSearchParams();
    const errorMessage = searchParams.get('message') || 'Authentication error occurred';

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h1>
            <p className="text-gray-700">{errorMessage}</p>
            <button
                onClick={() => window.location.href = '/'}
                className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Return to Home
            </button>
        </div>
    );
}

export default function ErrorPageWrapper() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthError />
        </Suspense>
    );
} 