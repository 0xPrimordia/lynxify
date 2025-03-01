'use client';

import { useState, useEffect, useRef } from 'react';
import TestnetAlert from '@/app/components/TestnetAlert';
import EthDenverGovernanceNav from '@/app/components/EthDenverGovernanceNav';

// Define proper types for our data structures
interface MarketConditions {
  prices: {
    hbar: number;
    sauce: number;
    clxy: number;
  };
  volatility: {
    hbar: number;
    sauce: number;
    clxy: number;
  };
  liquidity: {
    hbar: number;
    sauce: number;
    clxy: number;
  };
}

interface TokenRatios {
  hbar: number;
  sauce: number;
  clxy: number;
}

interface RebalancingData {
  currentRatios: TokenRatios;
  marketConditions: MarketConditions;
  recentRecommendations: any[];
  topicId?: string;
  lastRebalanced: string;
}

interface AIRecommendation {
  ratios: TokenRatios;
  confidence: number;
  reasoning: string[];
  volatilityTrend: string;
  liquidityTrend: string;
  dataPoints: number;
  requestId?: string;
  topicId?: string;
  transactionId?: string;
  timestamp: string;
}

interface HistoricalRecommendation {
  timestamp: string;
  consensusTimestamp: string;
  requestId: string;
  ratios: TokenRatios;
  confidence: number;
  reasoning: string[];
  volatilityTrend: string;
  liquidityTrend: string;
  dataPoints: number;
}

export default function EthDenverRebalancingPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [rebalancingData, setRebalancingData] = useState<RebalancingData | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [rebalancingHistory, setRebalancingHistory] = useState<HistoricalRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionSuccess, setExecutionSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchRebalancingData = async () => {
      try {
        // For EthDenver demo, use mock data
        const mockData: RebalancingData = {
          currentRatios: {
            hbar: 0.33333,
            sauce: 0.33333,
            clxy: 0.33333
          },
          marketConditions: {
            prices: {
              hbar: 0.068,
              sauce: 0.0042,
              clxy: 0.0015
            },
            volatility: {
              hbar: 0.05,
              sauce: 0.12,
              clxy: 0.18
            },
            liquidity: {
              hbar: 0.9,
              sauce: 0.7,
              clxy: 0.5
            }
          },
          recentRecommendations: [],
          lastRebalanced: '2023-02-15T12:00:00Z'
        };
        
        setRebalancingData(mockData);
        
        // Mock AI recommendation
        const mockRecommendation: AIRecommendation = {
          ratios: {
            hbar: 0.45,
            sauce: 0.30,
            clxy: 0.25
          },
          confidence: 0.87,
          reasoning: [
            "HBAR has shown increased stability in the past 30 days",
            "SAUCE volatility has decreased by 15%",
            "CLXY market cap growth suggests reducing exposure slightly",
            "Current market conditions favor higher HBAR allocation"
          ],
          volatilityTrend: "Decreasing",
          liquidityTrend: "Stable",
          dataPoints: 1250,
          timestamp: new Date().toISOString()
        };
        
        setAiRecommendation(mockRecommendation);
        
        // Mock historical recommendations
        const mockHistory: HistoricalRecommendation[] = [
          {
            timestamp: '2023-02-01T10:15:00Z',
            consensusTimestamp: '2023-02-01T10:15:30Z',
            requestId: '0.0.12345-1675245300',
            ratios: { hbar: 0.40, sauce: 0.35, clxy: 0.25 },
            confidence: 0.82,
            reasoning: ["Market volatility high", "HBAR showing strength"],
            volatilityTrend: "Increasing",
            liquidityTrend: "Decreasing",
            dataPoints: 980
          },
          {
            timestamp: '2023-01-15T14:30:00Z',
            consensusTimestamp: '2023-01-15T14:30:45Z',
            requestId: '0.0.12345-1673792400',
            ratios: { hbar: 0.35, sauce: 0.35, clxy: 0.30 },
            confidence: 0.75,
            reasoning: ["Balanced approach recommended", "CLXY gaining momentum"],
            volatilityTrend: "Stable",
            liquidityTrend: "Stable",
            dataPoints: 850
          }
        ];
        
        setRebalancingHistory(mockHistory);
        
      } catch (error) {
        console.error('Error fetching rebalancing data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load rebalancing data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRebalancingData();
  }, []);

  const requestAIAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      // For EthDenver demo, we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the existing recommendation with a new timestamp
      if (aiRecommendation) {
        setAiRecommendation({
          ...aiRecommendation,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error('Error requesting AI analysis:', error);
      setError(error instanceof Error ? error.message : 'Failed to perform AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeRebalancing = async () => {
    try {
      setIsExecuting(true);
      setExecutionSuccess(false);
      
      // For EthDenver demo, we'll simulate an API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update current ratios to match AI recommendation
      if (rebalancingData && aiRecommendation) {
        setRebalancingData({
          ...rebalancingData,
          currentRatios: aiRecommendation.ratios,
          lastRebalanced: new Date().toISOString()
        });
      }
      
      setExecutionSuccess(true);
    } catch (error) {
      console.error('Error executing rebalancing:', error);
      setError(error instanceof Error ? error.message : 'Failed to execute rebalancing');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="w-full">
      <TestnetAlert />
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">AI-Enhanced Rebalancing</h1>
        <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
          EthDenver Demo
        </div>
      </div>
      <EthDenverGovernanceNav currentSection="rebalancing" />
      
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">Current Market Conditions</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium mb-2 text-gray-300">Token Prices</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">HBAR</div>
                      <div className="text-lg font-semibold text-white">
                        ${rebalancingData?.marketConditions.prices.hbar.toFixed(4)}
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">SAUCE</div>
                      <div className="text-lg font-semibold text-white">
                        ${rebalancingData?.marketConditions.prices.sauce.toFixed(4)}
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">CLXY</div>
                      <div className="text-lg font-semibold text-white">
                        ${rebalancingData?.marketConditions.prices.clxy.toFixed(4)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium mb-2 text-gray-300">Volatility</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">HBAR</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.marketConditions.volatility.hbar || 0) * 100}%
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">SAUCE</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.marketConditions.volatility.sauce || 0) * 100}%
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">CLXY</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.marketConditions.volatility.clxy || 0) * 100}%
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium mb-2 text-gray-300">Liquidity</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">HBAR</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.marketConditions.liquidity.hbar || 0) * 10}/10
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">SAUCE</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.marketConditions.liquidity.sauce || 0) * 10}/10
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">CLXY</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.marketConditions.liquidity.clxy || 0) * 10}/10
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-md font-medium text-gray-300">Current Composition</h3>
                    <div className="text-sm text-gray-400">
                      Last rebalanced: {new Date(rebalancingData?.lastRebalanced || '').toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">HBAR</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.currentRatios.hbar || 0) * 100}%
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">SAUCE</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.currentRatios.sauce || 0) * 100}%
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">CLXY</div>
                      <div className="text-lg font-semibold text-white">
                        {(rebalancingData?.currentRatios.clxy || 0) * 100}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={requestAIAnalysis}
                  disabled={isAnalyzing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <span className="flex items-center justify-center">
                      <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></span>
                      Analyzing Market Conditions...
                    </span>
                  ) : (
                    'Request AI Analysis'
                  )}
                </button>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-xl font-semibold mb-4 text-white">AI Recommendation</h2>
              
              {aiRecommendation ? (
                <div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm text-gray-400">Confidence Score</div>
                      <div className="text-sm text-gray-400">
                        Generated: {new Date(aiRecommendation.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-4">
                      <div 
                        className="bg-green-500 h-4 rounded-full" 
                        style={{ width: `${aiRecommendation.confidence * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-right text-sm mt-1 text-gray-300">
                      {(aiRecommendation.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-2 text-gray-300">Recommended Composition</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-sm text-gray-400">HBAR</div>
                        <div className="text-lg font-semibold text-white">
                          {(aiRecommendation.ratios.hbar * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {rebalancingData && (
                            (aiRecommendation.ratios.hbar > rebalancingData.currentRatios.hbar) 
                              ? `+${((aiRecommendation.ratios.hbar - rebalancingData.currentRatios.hbar) * 100).toFixed(1)}%` 
                              : `${((aiRecommendation.ratios.hbar - rebalancingData.currentRatios.hbar) * 100).toFixed(1)}%`
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-sm text-gray-400">SAUCE</div>
                        <div className="text-lg font-semibold text-white">
                          {(aiRecommendation.ratios.sauce * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {rebalancingData && (
                            (aiRecommendation.ratios.sauce > rebalancingData.currentRatios.sauce) 
                              ? `+${((aiRecommendation.ratios.sauce - rebalancingData.currentRatios.sauce) * 100).toFixed(1)}%` 
                              : `${((aiRecommendation.ratios.sauce - rebalancingData.currentRatios.sauce) * 100).toFixed(1)}%`
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-700 p-3 rounded">
                        <div className="text-sm text-gray-400">CLXY</div>
                        <div className="text-lg font-semibold text-white">
                          {(aiRecommendation.ratios.clxy * 100).toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {rebalancingData && (
                            (aiRecommendation.ratios.clxy > rebalancingData.currentRatios.clxy) 
                              ? `+${((aiRecommendation.ratios.clxy - rebalancingData.currentRatios.clxy) * 100).toFixed(1)}%` 
                              : `${((aiRecommendation.ratios.clxy - rebalancingData.currentRatios.clxy) * 100).toFixed(1)}%`
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-md font-medium mb-2 text-gray-300">AI Reasoning</h3>
                    <div className="bg-gray-700 p-4 rounded">
                      <ul className="list-disc pl-5 space-y-1 text-gray-300">
                        {aiRecommendation.reasoning.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">Volatility Trend</div>
                      <div className="text-lg font-semibold text-white">
                        {aiRecommendation.volatilityTrend}
                      </div>
                    </div>
                    <div className="bg-gray-700 p-3 rounded">
                      <div className="text-sm text-gray-400">Liquidity Trend</div>
                      <div className="text-lg font-semibold text-white">
                        {aiRecommendation.liquidityTrend}
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-700">
                    <button
                      onClick={executeRebalancing}
                      disabled={isExecuting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                    >
                      {isExecuting ? (
                        <span className="flex items-center justify-center">
                          <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></span>
                          Executing Rebalance...
                        </span>
                      ) : (
                        'Execute Rebalancing'
                      )}
                    </button>
                    
                    {executionSuccess && (
                      <div className="mt-4 p-3 bg-green-900/50 border border-green-700 rounded text-green-200">
                        Rebalancing executed successfully! The new token composition has been applied.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <p>No AI recommendation available</p>
                  <p className="text-sm mt-2">Click "Request AI Analysis" to generate a recommendation</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Historical Recommendations Table */}
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4 text-white">Historical Recommendations</h3>
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-400">Loading history...</p>
              </div>
            ) : rebalancingHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">HBAR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">SAUCE</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">CLXY</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Confidence</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {rebalancingHistory.map((rec, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {new Date(rec.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-gray-300">
                          {rec.ratios && rec.ratios.hbar !== undefined ? 
                            `${(rec.ratios.hbar * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="py-3 text-gray-300">
                          {rec.ratios && rec.ratios.sauce !== undefined ? 
                            `${(rec.ratios.sauce * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="py-3 text-gray-300">
                          {rec.ratios && rec.ratios.clxy !== undefined ? 
                            `${(rec.ratios.clxy * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td className="py-3 text-gray-300">
                          {rec.confidence !== undefined ? 
                            `${(rec.confidence * 100).toFixed(0)}%` : 'N/A'}
                        </td>
                        <td className="py-3 text-gray-300">
                          {rec.volatilityTrend || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p>No historical recommendations available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 