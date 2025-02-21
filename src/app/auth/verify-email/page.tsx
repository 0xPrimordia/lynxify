'use client';

import { useSearchParams } from 'next/navigation';
import CreateWalletForm from '@/app/components/CreateWalletForm';
import { Suspense } from 'react';
import { Alert } from "@nextui-org/react";

function VerifyEmailPage() {
    const searchParams = useSearchParams();
    const errorParam = searchParams.get('error');

    return (
        <div className="min-h-screen bg-black flex items-start justify-center pt-20">
            <div className="w-[450px] bg-black rounded-lg shadow-xl p-8 mx-4">
                {errorParam ? (
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4 text-red-400">Verification Failed</h1>
                        <Alert className="mb-4" color="danger">
                            {errorParam}
                        </Alert>
                    </div>
                ) : (
                    <>
                        <Alert 
                            className="mb-6"
                            color="success"
                        >
                            Your email has been verified. Please create your wallet to continue.
                        </Alert>
                        <CreateWalletForm />
                    </>
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