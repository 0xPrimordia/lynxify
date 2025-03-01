'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  aiAnalysis?: {
    recommendation: string;
    reasoning: string[];
    marketImpact: string;
    riskAssessment: string;
  };
}

export default function EthDenverProposalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [voteSuccess, setVoteSuccess] = useState<boolean>(false);
  const [userVote, setUserVote] = useState<'for' | 'against' | null>(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        // For EthDenver demo, use mock data
        const mockProposals: Proposal[] = [
          {
            id: '1',
            title: 'Increase HBAR allocation to 50%',
            description: 'Given recent market volatility, we should increase our HBAR allocation for stability. HBAR has shown lower volatility compared to other assets in our index, and increasing its allocation would provide more stability during market downturns.\n\nThe proposed change would shift our allocation from equal weighting to a more HBAR-heavy portfolio, reducing exposure to the more volatile CLXY token.',
            proposer: '0.0.12345',
            status: 'active',
            votesFor: 1250000,
            votesAgainst: 750000,
            createdAt: '2023-02-20T10:00:00Z',
            endsAt: '2023-03-05T10:00:00Z',
            proposedRatios: { hbar: 0.5, sauce: 0.3, clxy: 0.2 },
            aiAnalysis: {
              recommendation: 'Neutral',
              reasoning: [
                'HBAR has shown 15% lower volatility than the basket average',
                'Market conditions suggest moderate risk of CLXY price decline',
                'Proposed allocation reduces diversification benefits',
                'Historical data shows similar allocations underperformed in recovery periods'
              ],
              marketImpact: 'The proposed change would likely reduce short-term volatility by 8-12%, but may limit upside potential by approximately 5-7% based on current market trends.',
              riskAssessment: 'Medium-Low Risk'
            }
          },
          {
            id: '2',
            title: 'Reduce CLXY exposure temporarily',
            description: 'CLXY has shown high volatility. Proposal to reduce allocation until market stabilizes. Recent price action suggests increased risk in the short term, while SAUCE has demonstrated more stable growth patterns.\n\nThis temporary reallocation would be revisited in 3 months to determine if market conditions warrant returning to a more balanced allocation.',
            proposer: '0.0.54321',
            status: 'active',
            votesFor: 980000,
            votesAgainst: 820000,
            createdAt: '2023-02-18T14:30:00Z',
            endsAt: '2023-03-04T14:30:00Z',
            proposedRatios: { hbar: 0.4, sauce: 0.45, clxy: 0.15 },
            aiAnalysis: {
              recommendation: 'Support',
              reasoning: [
                'CLXY volatility has increased 28% in the past 30 days',
                'Technical indicators suggest continued short-term volatility',
                'SAUCE has demonstrated positive correlation with market growth',
                'Temporary reduction aligns with risk management best practices'
              ],
              marketImpact: 'The proposed change would likely reduce portfolio volatility by 15-20% while maintaining 85-90% of potential upside based on current market conditions.',
              riskAssessment: 'Low Risk'
            }
          },
          {
            id: '3',
            title: 'Equal distribution rebalance',
            description: 'Return to equal distribution across all tokens for balanced exposure. This proposal aims to reset our allocation to the original design of equal weighting.\n\nEqual distribution provides maximum diversification and reduces the risk of any single asset significantly impacting portfolio performance.',
            proposer: '0.0.98765',
            status: 'passed',
            votesFor: 1500000,
            votesAgainst: 500000,
            createdAt: '2023-02-01T09:15:00Z',
            endsAt: '2023-02-15T09:15:00Z',
            proposedRatios: { hbar: 0.33333, sauce: 0.33333, clxy: 0.33334 },
            aiAnalysis: {
              recommendation: 'Strong Support',
              reasoning: [
                'Equal weighting has historically provided optimal risk-adjusted returns',
                'Current market conditions show no clear advantage for any single asset',
                'Maximizes diversification benefits',
                'Aligns with original index design principles'
              ],
              marketImpact: 'The proposed change would provide balanced exposure across all assets, optimizing for long-term growth while maintaining moderate volatility.',
              riskAssessment: 'Low Risk'
            }
          },
          {
            id: '4',
            title: 'Increase SAUCE allocation',
            description: 'SAUCE has shown strong growth potential. Proposal to increase allocation. Recent developments in the SAUCE ecosystem suggest potential for significant growth in the coming months.\n\nThis proposal would shift our allocation to capitalize on these developments while maintaining sufficient diversification.',
            proposer: '0.0.24680',
            status: 'rejected',
            votesFor: 600000,
            votesAgainst: 1400000,
            createdAt: '2023-01-25T11:45:00Z',
            endsAt: '2023-02-08T11:45:00Z',
            proposedRatios: { hbar: 0.25, sauce: 0.5, clxy: 0.25 },
            aiAnalysis: {
              recommendation: 'Oppose',
              reasoning: [
                'SAUCE growth projections are based on speculative developments',
                'Proposed allocation creates significant concentration risk',
                'Historical data shows similar concentrations underperformed',
                'Current market conditions favor diversification'
              ],
              marketImpact: 'The proposed change would increase portfolio volatility by 25-30% with only a potential 10-15% increase in upside based on optimistic projections.',
              riskAssessment: 'High Risk'
            }
          }
        ];
        
        const foundProposal = mockProposals.find(p => p.id === id);
        
        if (!foundProposal) {
          throw new Error('Proposal not found');
        }
        
        setProposal(foundProposal);
      } catch (error) {
        console.error('Error fetching proposal:', error);
        setError('Failed to load proposal details');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProposal();
    }
  }, [id]);

  const handleVote = async (vote: 'for' | 'against') => {
    setIsVoting(true);
    setError(null);
    
    try {
      // For EthDenver demo, simulate voting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (proposal) {
        const updatedProposal = { ...proposal };
        if (vote === 'for') {
          updatedProposal.votesFor += 1250; // Simulate voting power
        } else {
          updatedProposal.votesAgainst += 1250;
        }
        setProposal(updatedProposal);
      }
      
      setUserVote(vote);
      setVoteSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setVoteSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error voting on proposal:', error);
      setError('Failed to submit vote');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="w-full">
      <TestnetAlert />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Proposal Details</h1>
        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
          EthDenver Demo
        </div>
      </div>
      <EthDenverGovernanceNav currentSection="proposals" />
      
      <div className="mb-4">
        <Link href="/ethdenver/governance/proposals" className="text-blue-400 hover:text-blue-300 flex items-center">
          ← Back to Proposals
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      ) : error ? (
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded mb-6">
          {error}
        </div>
      ) : proposal ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-white">{proposal.title}</h2>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  proposal.status === 'active' ? 'bg-blue-600/20 text-blue-400' :
                  proposal.status === 'passed' ? 'bg-green-600/20 text-green-400' :
                  'bg-red-600/20 text-red-400'
                }`}>
                  {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                </div>
              </div>
              
              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-1">Proposed by</div>
                <div className="text-gray-300">{proposal.proposer}</div>
              </div>
              
              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-1">Description</div>
                <div className="text-gray-300 whitespace-pre-line">{proposal.description}</div>
              </div>
              
              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2">Proposed Token Allocation</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-sm text-gray-400">HBAR</div>
                    <div className="text-lg font-semibold text-white">
                      {proposal.proposedRatios ? (proposal.proposedRatios.hbar * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-sm text-gray-400">SAUCE</div>
                    <div className="text-lg font-semibold text-white">
                      {proposal.proposedRatios ? (proposal.proposedRatios.sauce * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                  <div className="bg-gray-700 p-3 rounded">
                    <div className="text-sm text-gray-400">CLXY</div>
                    <div className="text-lg font-semibold text-white">
                      {proposal.proposedRatios ? (proposal.proposedRatios.clxy * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="text-sm text-gray-400 mb-2">Timeline</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Created</div>
                    <div className="text-gray-300">{new Date(proposal.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Voting Ends</div>
                    <div className="text-gray-300">{new Date(proposal.endsAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
              
              {proposal.aiAnalysis && (
                <div className="mb-6 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-medium mb-3 text-white">AI Analysis</h3>
                  
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 mb-1">Recommendation</div>
                    <div className={`inline-block px-2 py-1 rounded text-sm ${
                      proposal.aiAnalysis.recommendation.includes('Support') ? 'bg-green-600/20 text-green-400' :
                      proposal.aiAnalysis.recommendation === 'Neutral' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {proposal.aiAnalysis.recommendation}
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 mb-1">Key Points</div>
                    <ul className="list-disc pl-5 text-gray-300 space-y-1">
                      {proposal.aiAnalysis.reasoning.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-sm text-gray-400 mb-1">Market Impact</div>
                    <div className="text-gray-300">{proposal.aiAnalysis.marketImpact}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Risk Assessment</div>
                    <div className={`inline-block px-2 py-1 rounded text-sm ${
                      proposal.aiAnalysis.riskAssessment.includes('Low') ? 'bg-green-600/20 text-green-400' :
                      proposal.aiAnalysis.riskAssessment.includes('Medium') ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {proposal.aiAnalysis.riskAssessment}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
              <h3 className="text-lg font-medium mb-4 text-white">Voting Results</h3>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>For</span>
                  <span>{((proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500"
                    style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-right text-sm text-gray-400 mt-1">
                  {(proposal.votesFor / 1000000).toFixed(2)}M votes
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Against</span>
                  <span>{((proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500"
                    style={{ width: `${(proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-right text-sm text-gray-400 mt-1">
                  {(proposal.votesAgainst / 1000000).toFixed(2)}M votes
                </div>
              </div>
              
              <div className="text-sm text-gray-400 mt-6 mb-2">
                Total Votes: {((proposal.votesFor + proposal.votesAgainst) / 1000000).toFixed(2)}M
              </div>
            </div>
            
            {proposal.status === 'active' && (
              <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-medium mb-4 text-white">Cast Your Vote</h3>
                
                {userVote ? (
                  <div className="text-center">
                    <div className="mb-3 text-gray-300">
                      You voted <span className={userVote === 'for' ? 'text-green-400' : 'text-red-400'}>
                        {userVote === 'for' ? 'For' : 'Against'}
                      </span> this proposal
                    </div>
                    
                    {voteSuccess && (
                      <div className="mb-3 p-2 bg-green-900/30 border border-green-700 rounded text-green-400">
                        Vote successfully recorded!
                      </div>
                    )}
                    
                    <button
                      onClick={() => setUserVote(null)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Change vote
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-gray-300 mb-4">
                      Your voting power: <span className="font-semibold">1,250 votes</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleVote('for')}
                        disabled={isVoting}
                        className="py-2 px-4 bg-green-600/20 hover:bg-green-600/30 border border-green-600 rounded-lg text-green-400 transition-colors"
                      >
                        {isVoting ? 'Voting...' : 'Vote For'}
                      </button>
                      
                      <button
                        onClick={() => handleVote('against')}
                        disabled={isVoting}
                        className="py-2 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-600 rounded-lg text-red-400 transition-colors"
                      >
                        {isVoting ? 'Voting...' : 'Vote Against'}
                      </button>
                    </div>
                    
                    {error && (
                      <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded text-red-400">
                        {error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg text-center">
          <p className="text-gray-300">Proposal not found</p>
          <Link href="/ethdenver/governance/proposals" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
            Return to proposals list
          </Link>
        </div>
      )}
    </div>
  );
} 