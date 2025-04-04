'use client';

import { ConnectWallet } from '../components/ConnectWallet';
import { useSearchParams } from 'next/navigation';
import { VT323 } from "next/font/google";
import { Suspense } from 'react';

const vt323 = VT323({ weight: "400", subsets: ["latin"] });

function RegisterContent() {
    const searchParams = useSearchParams();
    const campaignId = searchParams.get('c');

    return (
        <div className="min-h-screen bg-black flex items-start justify-center pt-20 w-full">
            <div className="w-[calc(100%-6px)] sm:w-[450px] bg-black rounded-lg border border-gray-800 shadow-xl p-4 sm:p-8 mx-0.5 sm:mx-0 min-w-[245px]">
                <h1 className={`text-4xl font-bold mb-6 text-white text-center ${vt323.className}`}>Register</h1>
                <ConnectWallet campaignId={campaignId} />
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-start justify-center pt-20">
            <div className="w-[450px] bg-black rounded-lg border border-gray-800 shadow-xl p-8 mx-4">
                <h1 className={`text-4xl font-bold mb-6 text-white text-center ${vt323.className}`}>Loading...</h1>
            </div>
        </div>}>
            <RegisterContent />
        </Suspense>
    );
} 