'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import GovernanceNav from '@/app/components/GovernanceNav';
import TestnetAlert from '@/app/components/TestnetAlert';

export default function EthDenverGovernanceDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Use a dedicated EthDenver endpoint
        const response = await fetch('/api/ethdenver/governance/dashboard');
        if (!response.ok) throw new Error('Failed to fetch dashboard data');
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load governance data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="w-full">
      <TestnetAlert />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Governance Dashboard</h1>
        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
          EthDenver Demo
        </div>
      </div>
      <GovernanceNav currentSection="dashboard" />
      
      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded mb-6">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Current Composition</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">HBAR</span>
                <span className="font-medium text-white">33.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">SAUCE</span>
                <span className="font-medium text-white">33.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">CLXY</span>
                <span className="font-medium text-white">33.3%</span>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/ethdenver/governance/composition" className="text-blue-400 hover:text-blue-300">
                View Details →
              </Link>
            </div>
          </div>
          
          {/* AI Rebalancing */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">AI Rebalancing</h2>
            <div className="text-sm text-gray-300 mb-4">
              Next scheduled rebalance in 3 days
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">AI Confidence</span>
                <span className="font-medium text-white">87%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Market Volatility</span>
                <span className="font-medium text-white">Moderate</span>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/ethdenver/governance/rebalancing" className="text-blue-400 hover:text-blue-300">
                View Analysis →
              </Link>
            </div>
          </div>
          
          {/* Active Proposals */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Active Proposals</h2>
            <div className="text-sm text-gray-300 mb-4">
              2 proposals require your vote
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Total Proposals</span>
                <span className="font-medium text-white">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Your Voting Power</span>
                <span className="font-medium text-white">1,250 LYNXG</span>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/ethdenver/governance/proposals" className="text-blue-400 hover:text-blue-300">
                View Proposals →
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Link href="/ethdenver/governance/rebalancing" className="block">
          <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-6 hover:bg-blue-800/30 transition">
            <h2 className="text-xl font-semibold mb-2 text-white">AI-Enhanced Rebalancing</h2>
            <p className="text-gray-300">
              View AI analysis of market conditions and recommended token ratio adjustments
            </p>
          </div>
        </Link>
        
        <Link href="/ethdenver/governance/proposals" className="block">
          <div className="bg-purple-900/30 border border-purple-800 rounded-lg p-6 hover:bg-purple-800/30 transition">
            <h2 className="text-xl font-semibold mb-2 text-white">Governance Proposals</h2>
            <p className="text-gray-300">
              Browse, create, and vote on governance proposals for LYNX protocol
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
} 