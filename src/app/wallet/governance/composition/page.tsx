'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import TestnetAlert from '@/app/components/TestnetAlert';
import GovernanceNav from '@/app/components/GovernanceNav';

interface TokenData {
  name: string;
  allocation: number;
}

interface CategoryData {
  name: string;
  tokens: {
    [key: string]: TokenData;
  };
  allTokens: string[]; // All available tokens in this category
}

interface CompositionData {
  categories: {
    [key: string]: CategoryData;
  };
  aiRecommendation?: {
    categories: {
      [key: string]: CategoryData;
    };
    reasoning: string;
  };
}

export default function CompositionPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [compositionData, setCompositionData] = useState<CompositionData | null>(null);
  const [desiredComposition, setDesiredComposition] = useState<CompositionData | null>(null);
  const [showVoteButton, setShowVoteButton] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { supabase } = useSupabase();

  useEffect(() => {
    const fetchCompositionData = async () => {
      try {
        // In a real implementation, this would fetch from an API
        // For now, we'll use mock data
        const mockData: CompositionData = {
          categories: {
            "Smart Contract Platforms": {
              name: "Smart Contract Platforms",
              tokens: {
                "HBAR": { name: "HBAR", allocation: 70 },
                "WETH": { name: "WETH", allocation: 20 },
                "WBTC": { name: "WBTC", allocation: 10 }
              },
              allTokens: ["HBAR", "WETH", "WBTC", "WAVAX", "WSOL"]
            },
            "DeFi & DEX Tokens": {
              name: "DeFi & DEX Tokens",
              tokens: {
                "SAUCE": { name: "SAUCE", allocation: 50 },
                "xSAUCE": { name: "xSAUCE", allocation: 30 },
                "HBARX": { name: "HBARX", allocation: 20 }
              },
              allTokens: ["SAUCE", "xSAUCE", "HBARX", "HLQT", "SGB"]
            },
            "Stablecoins": {
              name: "Stablecoins",
              tokens: {
                "USDC": { name: "USDC", allocation: 60 },
                "USDT": { name: "USDT", allocation: 30 },
                "DAI": { name: "DAI", allocation: 10 }
              },
              allTokens: ["USDC", "USDT", "DAI", "HCHF", "BUSD"]
            },
            "Enterprise & Utility Tokens": {
              name: "Enterprise & Utility Tokens",
              tokens: {
                "CLXY": { name: "CLXY", allocation: 40 },
                "DOVU": { name: "DOVU", allocation: 40 },
                "HST": { name: "HST", allocation: 20 }
              },
              allTokens: ["CLXY", "DOVU", "HST", "HBAR+", "ATMA"]
            },
            "GameFi & NFT Infrastructure": {
              name: "GameFi & NFT Infrastructure",
              tokens: {
                "JAM": { name: "JAM", allocation: 35 },
                "KARATE": { name: "KARATE", allocation: 35 },
                "PACK": { name: "PACK", allocation: 30 }
              },
              allTokens: ["JAM", "KARATE", "PACK", "GRELF", "STEAM"]
            }
          },
          aiRecommendation: {
            categories: {
              "Smart Contract Platforms": {
                name: "Smart Contract Platforms",
                tokens: {
                  "HBAR": { name: "HBAR", allocation: 65 },
                  "WETH": { name: "WETH", allocation: 25 },
                  "WBTC": { name: "WBTC", allocation: 10 }
                },
                allTokens: ["HBAR", "WETH", "WBTC", "WAVAX", "WSOL"]
              },
              "DeFi & DEX Tokens": {
                name: "DeFi & DEX Tokens",
                tokens: {
                  "SAUCE": { name: "SAUCE", allocation: 45 },
                  "xSAUCE": { name: "xSAUCE", allocation: 35 },
                  "HBARX": { name: "HBARX", allocation: 20 }
                },
                allTokens: ["SAUCE", "xSAUCE", "HBARX", "HLQT", "SGB"]
              },
              "Stablecoins": {
                name: "Stablecoins",
                tokens: {
                  "USDC": { name: "USDC", allocation: 55 },
                  "USDT": { name: "USDT", allocation: 30 },
                  "DAI": { name: "DAI", allocation: 15 }
                },
                allTokens: ["USDC", "USDT", "DAI", "HCHF", "BUSD"]
              },
              "Enterprise & Utility Tokens": {
                name: "Enterprise & Utility Tokens",
                tokens: {
                  "CLXY": { name: "CLXY", allocation: 45 },
                  "DOVU": { name: "DOVU", allocation: 35 },
                  "HST": { name: "HST", allocation: 20 }
                },
                allTokens: ["CLXY", "DOVU", "HST", "HBAR+", "ATMA"]
              },
              "GameFi & NFT Infrastructure": {
                name: "GameFi & NFT Infrastructure",
                tokens: {
                  "JAM": { name: "JAM", allocation: 40 },
                  "KARATE": { name: "KARATE", allocation: 30 },
                  "PACK": { name: "PACK", allocation: 30 }
                },
                allTokens: ["JAM", "KARATE", "PACK", "GRELF", "STEAM"]
              }
            },
            reasoning: "Based on recent market performance and ecosystem developments, we recommend slightly increasing WETH allocation due to its strong DeFi ecosystem growth. For DeFi tokens, xSAUCE has shown improved liquidity metrics warranting a higher allocation. In stablecoins, DAI's improved collateralization ratio suggests a modest increase."
          }
        };
        
        setCompositionData(mockData);
        setDesiredComposition(JSON.parse(JSON.stringify(mockData))); // Deep copy
      } catch (error) {
        console.error('Error fetching composition data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load composition data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompositionData();
  }, []);

  const handleTokenChange = (category: string, currentToken: string, newToken: string) => {
    if (!desiredComposition) return;
    
    const updatedComposition = JSON.parse(JSON.stringify(desiredComposition));
    const tokenData = updatedComposition.categories[category].tokens[currentToken];
    
    // Remove the current token and add the new one with the same allocation
    delete updatedComposition.categories[category].tokens[currentToken];
    updatedComposition.categories[category].tokens[newToken] = {
      name: newToken,
      allocation: tokenData.allocation
    };
    
    setDesiredComposition(updatedComposition);
    setShowVoteButton(true);
  };

  const handleVoteSubmit = async () => {
    try {
      // In a real implementation, this would submit to an API
      console.log('Submitting vote with composition:', desiredComposition);
      alert('Your vote has been submitted successfully!');
      setShowVoteButton(false);
    } catch (error) {
      console.error('Error submitting vote:', error);
      alert('Failed to submit vote. Please try again.');
    }
  };

  const handleSuggestCategory = () => {
    // In a real implementation, this would open a modal or navigate to a form
    alert('This would open a form to suggest a new token category');
  };

  const renderTokenCategory = (categoryName: string, categoryData: CategoryData, isEditable: boolean = false) => {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold text-white mb-4">{categoryName}</h3>
        <div className="space-y-4">
          {Object.entries(categoryData.tokens).map(([tokenName, tokenData]) => (
            <div key={tokenName} className="flex justify-between items-center">
              {isEditable ? (
                <select 
                  className="bg-gray-700 text-white p-2 rounded w-1/2"
                  value={tokenName}
                  onChange={(e) => handleTokenChange(categoryName, tokenName, e.target.value)}
                >
                  {categoryData.allTokens.map(token => (
                    <option key={token} value={token}>{token}</option>
                  ))}
                </select>
              ) : (
                <span className="text-gray-300">{tokenName}</span>
              )}
              <span className="font-medium text-white">{tokenData.allocation}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
      <TestnetAlert />
      <GovernanceNav currentSection="composition" />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Token Composition Governance</h1>
        
        <div className="grid grid-cols-1 gap-8">
          {/* Current Composition */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-6">Current Composition</h2>
            
            {compositionData && Object.entries(compositionData.categories).map(([categoryName, categoryData]) => (
              renderTokenCategory(categoryName, categoryData, true)
            ))}
            
            {showVoteButton && (
              <button 
                onClick={handleVoteSubmit}
                className="mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold"
              >
                Submit Vote
              </button>
            )}
            
            <div className="mt-8">
              <button 
                onClick={handleSuggestCategory}
                className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-lg font-semibold"
              >
                Suggest New Category
              </button>
            </div>
          </div>
          
          {/* AI Recommended Composition */}
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-6">AI Recommended Composition</h2>
            
            {compositionData?.aiRecommendation && Object.entries(compositionData.aiRecommendation.categories).map(([categoryName, categoryData]) => (
              renderTokenCategory(categoryName, categoryData)
            ))}
            
            <div className="mt-6 bg-blue-900/30 border border-blue-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-2">AI Reasoning</h3>
              <p className="text-gray-300">
                {compositionData?.aiRecommendation?.reasoning || 
                  "Our AI analysis suggests this composition based on current market conditions, token performance, and ecosystem developments."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 