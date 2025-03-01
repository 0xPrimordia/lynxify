'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ChartPieIcon, ArrowPathIcon, DocumentTextIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function EthDenverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  
  const navItems = [
    {
      name: 'Home',
      href: '/ethdenver',
      icon: HomeIcon,
    },
    {
      name: 'Governance',
      href: '/ethdenver/governance',
      icon: DocumentTextIcon,
    },
    {
      name: 'Composition',
      href: '/ethdenver/governance/composition',
      icon: ChartPieIcon,
    },
    {
      name: 'Rebalancing',
      href: '/ethdenver/governance/rebalancing',
      icon: ArrowPathIcon,
    },
    {
      name: 'Proposals',
      href: '/ethdenver/governance/proposals',
      icon: DocumentTextIcon,
    },
    {
      name: 'Mint',
      href: '/ethdenver/mint',
      icon: CurrencyDollarIcon,
    }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold">LYNX Protocol</span>
              <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">EthDenver Demo</span>
            </div>
            <div>
              <a 
                href="https://github.com/0xPrimordia/lynxify" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-white"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-6">
        <nav className="flex overflow-x-auto pb-3 mb-6 scrollbar-hide">
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                              (item.href !== '/ethdenver' && pathname.startsWith(item.href));
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md whitespace-nowrap
                    ${isActive 
                      ? 'bg-blue-600 text-white font-medium' 
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}
                  `}
                >
                  <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        
        {children}
      </div>
      
      <footer className="bg-gray-800 border-t border-gray-700 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-gray-400 text-sm">
            <p>LYNX Protocol - EthDenver 2024 Demo</p>
            <p className="mt-2">
              This is a demonstration of the LYNX Protocol for the EthDenver hackathon.
              No real transactions are processed.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 