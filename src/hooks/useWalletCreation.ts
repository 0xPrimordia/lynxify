import { useState } from 'react';
import { WalletService, WalletConfig } from '../lib/wallet/service';

export const useWalletCreation = () => {
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const walletService = new WalletService();

    const createNewWallet = async (password: string) => {
        setIsCreating(true);
        setError(null);
        try {
            const wallet = await walletService.createWallet(password);
            return wallet;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create wallet');
            throw err;
        } finally {
            setIsCreating(false);
        }
    };

    return {
        createNewWallet,
        isCreating,
        error
    };
}; 