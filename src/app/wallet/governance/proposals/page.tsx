'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSupabase } from '@/app/hooks/useSupabase';

interface Proposal {
  id: string;
  title: string;
  description: string;
  proposer: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  votesFor: number;
  votesAgainst: number;
  createdAt: string;
  endsAt: string;
  type: 'rebalance' | 'parameter' | 'upgrade' | 'other';
  aiAnalysis?: {
    recommendation: 'for' | 'against' | 'neutral';
    confidence: number;
    reasoning: string[];
  };
  details?: any;
}

export default function ProposalsPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        // In a real implementation, this would fetch from an API
        // For now, we'll use mock data
        const mockProposals: Proposal[] = [
          {
            id: 'prop-001',
            title: 'Increase HBAR allocation to 40%',
            description: 'This proposal suggests increasing the HBAR allocation from 33.3% to 40% to reduce overall volatility.',
            proposer: '0.0.1234567',
            status: 'active',
            votesFor: 750000,
            votesAgainst: 250000,
            createdAt: '2023-06-01',
            endsAt: '2023-06-15',
            type: 'rebalance',
            aiAnalysis: {
              recommendation: 'for',
              confidence: 0.85,
              reasoning: [
                'HBAR has shown lower volatility in recent market conditions',
                'Increased HBAR allocation would reduce overall index volatility',
                'Current market trends favor HBAR price appreciation'
              ]
            },
            details: {
              currentRatios: { hbar: 0.33333, sauce: 0.33333, clxy: 0.33333 },
              proposedRatios: { hbar: 0.4, sauce: 0.35, clxy: 0.25 }
            }
          },
          {
            id: 'prop-002',
            title: 'Add emergency pause mechanism',
            description: 'This proposal suggests adding an emergency pause mechanism that can be triggered by a 2/3 majority vote.',
            proposer: '0.0.7654321',
            status: 'pending',
            votesFor: 0,
            votesAgainst: 0,
            createdAt: '2023-06-05',
            endsAt: '2023-06-19',
            type: 'parameter',
            aiAnalysis: {
              recommendation: 'neutral',
              confidence: 0.6,
              reasoning: [
                'Emergency mechanisms can protect against exploits',
                'However, they introduce centralization concerns',
                'Implementation details need careful consideration'
              ]
            }
          },
          {
            id: 'prop-003',
            title: 'Reduce rebalancing frequency',
            description: 'This proposal suggests reducing the rebalancing frequency from monthly to quarterly to save on gas costs.',
            proposer: '0.0.2468135',
            status: 'rejected',
            votesFor: 300000,
            votesAgainst: 700000,
            createdAt: '2023-05-15',
            endsAt: '2023-05-29',
            type: 'parameter'
          }
        ];
        
        setProposals(mockProposals);
      } catch (error) {
        console.error('Error fetching proposals:', error);
        setError(error instanceof Error ? error.message : 'Failed to load proposals');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const filteredProposals = activeFilter === 'all' 
    ? proposals 
    : proposals.filter(p => p.status === activeFilter);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded mb-6">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold text-white mb-4 md:mb-0">Governance Proposals</h1>
        
        <div className="flex space-x-2">
          <button 
            className={`px-4 py-2 rounded-lg ${activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button 
            className={`px-4 py-2 rounded-lg ${activeFilter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => setActiveFilter('active')}
          >
            Active
          </button>
          <button 
            className={`px-4 py-2 rounded-lg ${activeFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => setActiveFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`px-4 py-2 rounded-lg ${activeFilter === 'passed' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => setActiveFilter('passed')}
          >
            Passed
          </button>
          <button 
            className={`px-4 py-2 rounded-lg ${activeFilter === 'rejected' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => setActiveFilter('rejected')}
          >
            Rejected
          </button>
        </div>
      </div>
      
      <div className="mb-6">
        <Link 
          href="/wallet/governance/proposals/create"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold"
        >
          Create New Proposal
        </Link>
      </div>
      
      <div className="space-y-6">
        {filteredProposals.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
            No proposals found matching the selected filter.
          </div>
        ) : (
          filteredProposals.map(proposal => (
            <div key={proposal.id} className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <h2 className="text-xl font-semibold text-white mb-2 md:mb-0">{proposal.title}</h2>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    proposal.status === 'active' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                    proposal.status === 'passed' ? 'bg-blue-900/50 text-blue-400 border border-blue-700' :
                    proposal.status === 'rejected' ? 'bg-red-900/50 text-red-400 border border-red-700' :
                    'bg-yellow-900/50 text-yellow-400 border border-yellow-700'
                  }`}>
                    {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                  </span>
                  
                  <span className={`px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-300`}>
                    {proposal.type.charAt(0).toUpperCase() + proposal.type.slice(1)}
                  </span>
                </div>
              </div>
              
              <p className="text-gray-300 mb-4">{proposal.description}</p>
              
              {proposal.aiAnalysis && (
                <div className="mb-4 bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-gray-300 mr-2">AI Analysis:</span>
                    <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                      proposal.aiAnalysis.recommendation === 'for' ? 'bg-green-900/50 text-green-400 border border-green-700' :
                      proposal.aiAnalysis.recommendation === 'against' ? 'bg-red-900/50 text-red-400 border border-red-700' :
                      'bg-gray-600 text-gray-300 border border-gray-500'
                    }`}>
                      {proposal.aiAnalysis.recommendation.charAt(0).toUpperCase() + proposal.aiAnalysis.recommendation.slice(1)}
                    </span>
                    <span className="ml-2 text-sm text-gray-400">
                      ({(proposal.aiAnalysis.confidence * 100).toFixed(0)}% confidence)
                    </span>
                  </div>
                  
                  <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                    {proposal.aiAnalysis.reasoning.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex flex-col md:flex-row md:items-center justify-between text-sm text-gray-400 mb-4">
                <div>
                  Proposed by: <span className="text-blue-400">{proposal.proposer}</span>
                </div>
                <div>
                  Created: {proposal.createdAt} | 
                  {proposal.status === 'active' || proposal.status === 'pending' 
                    ? ` Ends: ${proposal.endsAt}`
                    : ` Ended: ${proposal.endsAt}`}
                </div>
              </div>
              
              {proposal.status === 'active' && (
                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-300">Votes</span>
                    <span className="text-gray-300">
                      {((proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100).toFixed(1)}% in favor
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-green-500 h-2" 
                      style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{proposal.votesFor.toLocaleString()} FOR</span>
                    <span>{proposal.votesAgainst.toLocaleString()} AGAINST</span>
                  </div>
                </div>
              )}
              
              {proposal.status === 'active' && (
                <div className="flex space-x-4 mt-4">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex-1">
                    Vote For
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex-1">
                    Vote Against
                  </button>
                </div>
              )}
              
              <div className="mt-4 text-right">
                <Link 
                  href={`/wallet/governance/proposals/${proposal.id}`}
                  className="text-blue-400 hover:text-blue-300"
                >
                  View Details →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 