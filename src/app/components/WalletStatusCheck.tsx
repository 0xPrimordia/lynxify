'use client';

import { useEffect, useState } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import CreateWallet from '@/app/auth/verify-email/page';

interface WalletStatusCheckProps {
    children: React.ReactNode;
}

export default function WalletStatusCheck({ children }: WalletStatusCheckProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [needsWallet, setNeedsWallet] = useState(false);
    const { supabase } = useSupabase();

    useEffect(() => {
        checkWalletStatus();
    }, []);

    const checkWalletStatus = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setNeedsWallet(true);
                setIsLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            
            // Check both account existence and private key storage
            if (!user?.user_metadata?.hederaAccountId || !user?.user_metadata?.hasStoredPrivateKey) {
                setNeedsWallet(true);
                setIsLoading(false);
                return;
            }

            setIsLoading(false);
        } catch (error) {
            console.error('Error checking wallet status:', error);
            setNeedsWallet(true);
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (needsWallet) {
        return <CreateWallet />;
    }

    return <>{children}</>;
} 