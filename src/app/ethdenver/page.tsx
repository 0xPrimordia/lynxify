'use client';

import Link from 'next/link';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

export default function EthDenverLanding() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">LYNX Protocol</h1>
        <p className="text-xl text-gray-300">
          AI-Enhanced DeFi Index Protocol on Hedera
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-800 rounded-lg p-6 hover:from-blue-900/50 hover:to-purple-900/50 transition">
          <h2 className="text-2xl font-semibold mb-4">AI-Enhanced Governance</h2>
          <p className="text-gray-300 mb-6">
            Explore our AI-enhanced governance system that analyzes market conditions and recommends optimal token allocations.
          </p>
          <Link 
            href="/ethdenver/governance" 
            className="inline-flex items-center text-blue-400 hover:text-blue-300"
          >
            Explore Governance <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Link>
        </div>
        
        <div className="bg-gradient-to-br from-green-900/40 to-teal-900/40 border border-green-800 rounded-lg p-6 hover:from-green-900/50 hover:to-teal-900/50 transition">
          <h2 className="text-2xl font-semibold mb-4">Mint LYNX Tokens</h2>
          <p className="text-gray-300 mb-6">
            Mint LYNX index tokens by depositing HBAR, SAUCE, and CLXY in the current protocol ratios.
          </p>
          <Link 
            href="/ethdenver/mint" 
            className="inline-flex items-center text-green-400 hover:text-green-300"
          >
            Start Minting <ArrowRightIcon className="h-4 w-4 ml-1" />
          </Link>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">About This Demo</h2>
        <p className="text-gray-300 mb-4">
          This is a demonstration of the LYNX Protocol for the EthDenver hackathon. The demo showcases:
        </p>
        <ul className="list-disc list-inside text-gray-300 space-y-2 mb-4">
          <li>AI-enhanced governance for token rebalancing</li>
          <li>Token composition visualization and simulation</li>
          <li>Governance proposal creation and voting</li>
          <li>LYNX token minting interface</li>
        </ul>
        <p className="text-gray-300">
          The demo uses real AI technology through OpenAI&apos;s API but simulates blockchain interactions.
        </p>
      </div>
      
      <div className="text-center">
        <Link 
          href="/ethdenver/governance" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
        >
          Start Exploring
        </Link>
      </div>
    </div>
  );
} 