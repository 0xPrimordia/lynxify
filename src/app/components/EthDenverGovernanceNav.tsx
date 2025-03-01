import Link from 'next/link';
import { 
  ChartPieIcon, 
  ArrowPathIcon, 
  DocumentTextIcon, 
  HomeIcon 
} from '@heroicons/react/24/outline';

type GovernanceSection = 'dashboard' | 'composition' | 'rebalancing' | 'proposals';

interface GovernanceNavProps {
  currentSection: GovernanceSection;
}

export default function EthDenverGovernanceNav({ currentSection }: GovernanceNavProps) {
  const navItems = [
    {
      name: 'Dashboard',
      href: '/ethdenver/governance',
      icon: HomeIcon,
      id: 'dashboard'
    },
    {
      name: 'Composition',
      href: '/ethdenver/governance/composition',
      icon: ChartPieIcon,
      id: 'composition'
    },
    {
      name: 'Rebalancing',
      href: '/ethdenver/governance/rebalancing',
      icon: ArrowPathIcon,
      id: 'rebalancing'
    },
    {
      name: 'Proposals',
      href: '/ethdenver/governance/proposals',
      icon: DocumentTextIcon,
      id: 'proposals'
    }
  ];

  return (
    <nav className="flex flex-wrap bg-gray-800/50 rounded-lg p-1 mb-6">
      {navItems.map((item) => {
        const isActive = currentSection === item.id;
        return (
          <Link 
            key={item.id}
            href={item.href} 
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md m-1 transition-colors
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
    </nav>
  );
} 