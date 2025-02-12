import { useState } from 'react';
import { InAppWalletForm } from './InAppWalletForm';

export const ConnectWallet = () => {
    return (
        <div className="w-full max-w-md mx-auto">
            <InAppWalletForm />
        </div>
    );
}; 