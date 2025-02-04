'use client';

import { useRouter, usePathname } from 'next/navigation';
import { 
    WalletIcon, 
    ClockIcon, 
    ArrowUpOnSquareIcon,
    CurrencyDollarIcon,
    PhotoIcon
} from '@heroicons/react/24/outline';

const navigation = [
    { name: 'Portfolio', href: '/wallet', icon: WalletIcon },
    { name: 'NFTs', href: '/wallet/nfts', icon: PhotoIcon },
    { name: 'History', href: '/wallet/history', icon: ClockIcon },
    { name: 'Staking', href: '/wallet/staking', icon: CurrencyDollarIcon },
    { name: 'Export', href: '/wallet/export', icon: ArrowUpOnSquareIcon },
];

export default function WalletLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <div className="min-h-screen w-full bg-black">
            <div className="flex w-full">
                {/* Sidebar */}
                <div className="w-64 bg-black border-r border-gray-800 min-h-screen fixed">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-white">Wallet</h2>
                    </div>
                    <nav className="space-y-1 px-4">
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

                {/* Main content */}
                <div className="flex-1 pl-64">
                    <main className="w-full min-h-screen bg-black">
                        <div className="p-8">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
} 