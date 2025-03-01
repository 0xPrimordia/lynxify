'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TestnetAlert from '@/app/components/TestnetAlert';
import EthDenverGovernanceNav from '@/app/components/EthDenverGovernanceNav';

interface TokenRatios {
  hbar: number;
  sauce: number;
  clxy: number;
}

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
  proposedRatios?: TokenRatios;
}

export default function EthDenverProposalsPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    hbar: 33.33,
    sauce: 33.33,
    clxy: 33.34
  });

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        // For EthDenver demo, use mock data
        const mockProposals: Proposal[] = [
          {
            id: '1',
            title: 'Increase HBAR allocation to 50%',
            description: 'Given recent market volatility, we should increase our HBAR allocation for stability.',
            proposer: '0.0.12345',
            status: 'active',
            votesFor: 1250000,
            votesAgainst: 750000,
            createdAt: '2023-02-20T10:00:00Z',
            endsAt: '2023-03-05T10:00:00Z',
            proposedRatios: { hbar: 0.5, sauce: 0.3, clxy: 0.2 }
          },
          {
            id: '2',
            title: 'Reduce CLXY exposure temporarily',
            description: 'CLXY has shown high volatility. Proposal to reduce allocation until market stabilizes.',
            proposer: '0.0.54321',
            status: 'active',
            votesFor: 980000,
            votesAgainst: 820000,
            createdAt: '2023-02-18T14:30:00Z',
            endsAt: '2023-03-04T14:30:00Z',
            proposedRatios: { hbar: 0.4, sauce: 0.45, clxy: 0.15 }
          },
          {
            id: '3',
            title: 'Equal distribution rebalance',
            description: 'Return to equal distribution across all tokens for balanced exposure.',
            proposer: '0.0.98765',
            status: 'passed',
            votesFor: 1500000,
            votesAgainst: 500000,
            createdAt: '2023-02-01T09:15:00Z',
            endsAt: '2023-02-15T09:15:00Z',
            proposedRatios: { hbar: 0.33333, sauce: 0.33333, clxy: 0.33334 }
          },
          {
            id: '4',
            title: 'Increase SAUCE allocation',
            description: 'SAUCE has shown strong growth potential. Proposal to increase allocation.',
            proposer: '0.0.24680',
            status: 'rejected',
            votesFor: 600000,
            votesAgainst: 1400000,
            createdAt: '2023-01-25T11:45:00Z',
            endsAt: '2023-02-08T11:45:00Z',
            proposedRatios: { hbar: 0.25, sauce: 0.5, clxy: 0.25 }
          }
        ];
        
        setProposals(mockProposals);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching proposals:', error);
        setError('Failed to load proposals');
        setIsLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that ratios sum to 100%
    const totalRatio = newProposal.hbar + newProposal.sauce + newProposal.clxy;
    if (Math.abs(totalRatio - 100) > 0.1) {
      alert('Token ratios must sum to 100%');
      return;
    }
    
    // For EthDenver demo, just add to local state
    const newId = (proposals.length + 1).toString();
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(now.getDate() + 14); // 2 weeks voting period
    
    const createdProposal: Proposal = {
      id: newId,
      title: newProposal.title,
      description: newProposal.description,
      proposer: '0.0.12345', // Demo account
      status: 'active',
      votesFor: 0,
      votesAgainst: 0,
      createdAt: now.toISOString(),
      endsAt: endDate.toISOString(),
      proposedRatios: {
        hbar: newProposal.hbar / 100,
        sauce: newProposal.sauce / 100,
        clxy: newProposal.clxy / 100
      }
    };
    
    setProposals([createdProposal, ...proposals]);
    setShowCreateModal(false);
    
    // Reset form
    setNewProposal({
      title: '',
      description: '',
      hbar: 33.33,
      sauce: 33.33,
      clxy: 33.34
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProposal({
      ...newProposal,
      [name]: name === 'title' || name === 'description' ? value : parseFloat(value)
    });
  };

  return (
    <div className="w-full">
      <TestnetAlert />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Governance Proposals</h1>
        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
          EthDenver Demo
        </div>
      </div>
      <EthDenverGovernanceNav currentSection="proposals" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-gray-300">
            Vote on active proposals or create new ones to change the LYNX token composition
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Create Proposal
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded mb-6">
          {error}
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">Active Proposals</h2>
          <div className="space-y-4 mb-8">
            {proposals.filter(p => p.status === 'active').map(proposal => (
              <Link href={`/ethdenver/governance/proposals/${proposal.id}`} key={proposal.id}>
                <div className="bg-gray-800 hover:bg-gray-750 rounded-lg p-5 transition-colors border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-white">{proposal.title}</h3>
                      <p className="text-gray-400 mt-1 line-clamp-2">{proposal.description}</p>
                    </div>
                    <div className="bg-blue-600/20 text-blue-400 px-2 py-1 rounded text-sm">
                      Active
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>For: {(proposal.votesFor / 1000000).toFixed(2)}M</span>
                        <span>Against: {(proposal.votesAgainst / 1000000).toFixed(2)}M</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-400">Ends in</div>
                      <div className="text-white">
                        {Math.ceil((new Date(proposal.endsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          <h2 className="text-xl font-semibold mb-4 text-white">Past Proposals</h2>
          <div className="space-y-4">
            {proposals.filter(p => p.status !== 'active').map(proposal => (
              <Link href={`/ethdenver/governance/proposals/${proposal.id}`} key={proposal.id}>
                <div className="bg-gray-800 hover:bg-gray-750 rounded-lg p-5 transition-colors border border-gray-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-white">{proposal.title}</h3>
                      <p className="text-gray-400 mt-1 line-clamp-2">{proposal.description}</p>
                    </div>
                    <div className={`px-2 py-1 rounded text-sm ${
                      proposal.status === 'passed' 
                        ? 'bg-green-600/20 text-green-400' 
                        : 'bg-red-600/20 text-red-400'
                    }`}>
                      {proposal.status === 'passed' ? 'Passed' : 'Rejected'}
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center">
                    <div className="flex-1">
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${proposal.status === 'passed' ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between mt-1 text-xs text-gray-400">
                        <span>For: {(proposal.votesFor / 1000000).toFixed(2)}M</span>
                        <span>Against: {(proposal.votesAgainst / 1000000).toFixed(2)}M</span>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <div className="text-sm text-gray-400">Ended</div>
                      <div className="text-white">
                        {new Date(proposal.endsAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Create Proposal Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-4 text-white">Create New Proposal</h2>
            
            <form onSubmit={handleCreateProposal}>
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={newProposal.title}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <textarea
                  name="description"
                  value={newProposal.description}
                  onChange={handleInputChange}
                  className="w-full bg-gray-700 border border-gray-600 rounded p-2 h-32"
                  required
                ></textarea>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">Proposed Token Ratios</label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">HBAR %</label>
                    <input
                      type="number"
                      name="hbar"
                      value={newProposal.hbar}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">SAUCE %</label>
                    <input
                      type="number"
                      name="sauce"
                      value={newProposal.sauce}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">CLXY %</label>
                    <input
                      type="number"
                      name="clxy"
                      value={newProposal.clxy}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700 border border-gray-600 rounded p-2"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                    />
                  </div>
                </div>
                <div className="text-sm mt-2 text-gray-400">
                  Total: {(newProposal.hbar + newProposal.sauce + newProposal.clxy).toFixed(2)}% 
                  {Math.abs(newProposal.hbar + newProposal.sauce + newProposal.clxy - 100) > 0.1 && 
                    <span className="text-red-400 ml-2">(Must equal 100%)</span>
                  }
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
                >
                  Create Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 