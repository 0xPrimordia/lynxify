'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { 
    WalletIcon, 
    ClockIcon, 
    ArrowUpOnSquareIcon,
    CurrencyDollarIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';

const navigation = [
    { name: 'Portfolio', href: '/wallet', icon: WalletIcon },
    { name: 'Send', href: '/wallet/send', icon: ArrowUpOnSquareIcon },
    { name: 'NFTs', href: '/wallet/nfts', icon: PhotoIcon },
    { name: 'History', href: '/wallet/history', icon: ClockIcon },
    { name: 'Staking', href: '/wallet/staking', icon: CurrencyDollarIcon },
    { name: 'Export', href: '/wallet/export', icon: ArrowUpOnSquareIcon },
];

export default function WalletLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { supabase } = useSupabase();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkWalletStatus = async () => {
            try {
                if (pathname === '/wallet/setup') {
                    setIsLoading(false);
                    return;
                }

                const { data: { session } } = await supabase.auth.getSession();
                console.log('WalletLayout - Session:', session);
                if (!session) {
                    router.push('/auth/login');
                    return;
                }

                const { data: { user } } = await supabase.auth.getUser();
                console.log('WalletLayout - User metadata:', user?.user_metadata);
                
                if (!user?.user_metadata?.hederaAccountId || !user?.user_metadata?.hasStoredPrivateKey) {
                    console.log('WalletLayout - Missing wallet info:', {
                        hederaAccountId: user?.user_metadata?.hederaAccountId,
                        hasStoredPrivateKey: user?.user_metadata?.hasStoredPrivateKey
                    });
                    router.push('/wallet/setup');
                    return;
                }

                console.log('WalletLayout - Wallet check passed');
                setIsLoading(false);
            } catch (error) {
                console.error('WalletLayout - Error:', error);
                router.push('/wallet/setup');
            }
        };

        checkWalletStatus();
    }, [supabase, router, pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen w-full bg-black flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-black">
            <div className="flex w-full flex-col sm:flex-row">
                {/* Sidebar - mobile friendly */}
                <div className="w-full sm:w-64 bg-black border-b sm:border-r border-gray-800 sm:min-h-screen sm:fixed">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-white">Wallet</h2>
                    </div>
                    <nav className="space-y-1 px-4 pb-4 sm:pb-0">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <button
                                    key={item.name}
                                    onClick={() => router.push(item.href)}
                                    className={`${
                                        isActive
                                            ? 'bg-gray-800 text-white'
                                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                    } group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full transition-colors`}
                                >
                                    <item.icon
                                        className={`${
                                            isActive ? 'text-white' : 'text-gray-400'
                                        } mr-3 flex-shrink-0 h-5 w-5`}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Main content - adjusted for mobile */}
                <div className="flex-1 sm:pl-64">
                    <main className="w-full min-h-screen bg-black">
                        <div className="p-4 sm:p-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
} 