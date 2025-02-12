import { useState } from 'react';
import { InAppWalletForm } from './InAppWalletForm';

interface ConnectWalletProps {
    campaignId?: string | null;
}

export const ConnectWallet = ({ campaignId }: ConnectWalletProps) => {
    return (
        <div className="w-full max-w-md mx-auto">
            <InAppWalletForm campaignId={campaignId} />
        </div>
    );
}; 