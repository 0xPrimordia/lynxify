'use client';

import CreateWalletForm from '@/app/components/CreateWalletForm';

export default function WalletSetup() {
    return (
        <div className="min-h-screen w-full bg-black">
            <div className="w-[450px] mx-auto pt-20">
                <CreateWalletForm />
            </div>
        </div>
    );
} 