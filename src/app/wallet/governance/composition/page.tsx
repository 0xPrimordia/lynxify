'use client';

import { useState, useEffect, useRef } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import TestnetAlert from '@/app/components/TestnetAlert';
import GovernanceNav from '@/app/components/GovernanceNav';
import Image from 'next/image';
import { getTokenImageUrl } from '@/app/lib/utils/tokens';
import { useSaucerSwapContext } from '@/app/hooks/useTokens';
import { Token } from '@/app/types';
import { VT323 } from "next/font/google";
import DaoTestControls from '@/app/components/governance/DaoTestControls';
import { Alert } from "@nextui-org/react";

const vt323 = VT323({ weight: "400", subsets: ["latin"] });

interface TokenData {
  name: string;
  allocation: number;
}

interface SectorData {
  name: string;
  selectedToken: string; // Currently selected token
  tokens: string[]; // All available tokens in this sector
  allocations?: { [key: string]: number }; // Optional allocations for display
}

interface CompositionData {
  sectors: {
    [key: string]: SectorData;
  };
  aiRecommendation?: {
    sectors: {
      [key: string]: SectorData;
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
  const { tokens } = useSaucerSwapContext();
  const [userTopicId, setUserTopicId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [consensusComposition, setConsensusComposition] = useState<CompositionData | null>(null);
  const [marketCapData, setMarketCapData] = useState<{[key: string]: number}>({
    // Mock market cap data in millions
    'HBAR': 2000,
    'WETH': 200000,
    'WBTC': 500000,
    'WAVAX': 5000,
    'WSOL': 8000,
    'SAUCE': 50,
    'xSAUCE': 20,
    'HBARX': 30,
    'HLQT': 15,
    'SGB': 10,
    'USDC': 30000,
    'USDT': 35000,
    'DAI': 5000,
    'HCHF': 100,
    'BUSD': 8000,
    'CLXY': 200,
    'DOVU': 50,
    'HST': 30,
    'HBAR+': 20,
    'ATMA': 15,
    'JAM': 40,
    'KARATE': 30,
    'PACK': 25,
    'GRELF': 10,
    'STEAM': 15
  });
  const [alertMessage, setAlertMessage] = useState<string | React.ReactNode | null>(null);
  const [alertType, setAlertType] = useState<"success" | "error" | "warning" | "info">("info");
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Map token symbols to their CloudFront URLs
  const getTokenIconUrl = (symbol: string): string => {
    const tokenMap: Record<string, string> = {
      'HBAR': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.15058.png',
      'WETH': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1440.png',
      'WBTC': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1439.png',
      'WAVAX': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1442.png',
      'WSOL': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1445.png',
      'SAUCE': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1055.png',
      'xSAUCE': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1188.png',
      'HBARX': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1062.png',
      'HLQT': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1465.png',
      'SGB': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1092.png',
      'USDC': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1063.png',
      'USDT': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1064.png',
      'DAI': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1066.png',
      'HCHF': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1192.png',
      'BUSD': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1065.png',
      'CLXY': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1130.png',
      'DOVU': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1362.png',
      'HST': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1304.png',
      'HBAR+': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1470.png',
      'ATMA': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1366.png',
      'JAM': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1159.png',
      'KARATE': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1185.png',
      'PACK': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1329.png',
      'GRELF': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1364.png',
      'STEAM': 'https://d1grbdlekdv9wn.cloudfront.net/icons/tokens/0.0.1478.png',
    };
    
    // Try to find the token in the SaucerSwap context first
    if (tokens && Array.isArray(tokens)) {
      const token = tokens.find((t: Token) => t.symbol === symbol);
      if (token && token.icon) {
        return getTokenImageUrl(token.icon);
      }
    }
    
    // Fall back to our hardcoded map
    return tokenMap[symbol] || '/images/tokens/default.png';
  };

  // Calculate direct allocation percentages for selected tokens
  const calculateDirectAllocations = (composition: CompositionData): CompositionData => {
    // Create a deep copy to avoid reference issues
    const updatedComposition: CompositionData = JSON.parse(JSON.stringify(composition));
    
    // Get all selected tokens and their market caps
    const selectedTokensMarketCap: Record<string, number> = {};
    let totalMarketCap = 0;
    
    for (const sectorKey in updatedComposition.sectors) {
      const sector = updatedComposition.sectors[sectorKey];
      const token = sector.selectedToken;
      const marketCap = marketCapData[token] || 0;
      
      selectedTokensMarketCap[token] = marketCap;
      totalMarketCap += marketCap;
    }
    
    // Calculate percentage for each selected token
    if (totalMarketCap > 0) {
      for (const sectorKey in updatedComposition.sectors) {
        const sector = updatedComposition.sectors[sectorKey];
        const token = sector.selectedToken;
        const marketCap = selectedTokensMarketCap[token];
        
        // Calculate percentage and round to nearest whole number
        const percentage = Math.round((marketCap / totalMarketCap) * 100);
        
        // Initialize allocations if needed
        if (!sector.allocations) {
          sector.allocations = {};
        }
        
        // Set allocation for the selected token
        sector.allocations[token] = percentage;
      }
    }
    
    // Ensure allocations sum to 100%
    let totalAllocation = 0;
    let largestSectorKey = '';
    let largestAllocation = 0;
    
    for (const sectorKey in updatedComposition.sectors) {
      const sector = updatedComposition.sectors[sectorKey];
      const allocation = sector.allocations?.[sector.selectedToken] || 0;
      
      totalAllocation += allocation;
      
      if (allocation > largestAllocation) {
        largestAllocation = allocation;
        largestSectorKey = sectorKey;
      }
    }
    
    // Adjust the largest allocation to make the total 100%
    if (totalAllocation !== 100 && largestSectorKey) {
      const largestSector = updatedComposition.sectors[largestSectorKey];
      if (largestSector.allocations) {
        const adjustment = 100 - totalAllocation;
        largestSector.allocations[largestSector.selectedToken] += adjustment;
      }
    }
    
    return updatedComposition;
  };

  // Add this function to implement sector caps with hard enforcement
  const calculateSectorCappedAllocations = (composition: CompositionData): CompositionData => {
    const updatedComposition: CompositionData = JSON.parse(JSON.stringify(composition));
    const MAX_SECTOR_WEIGHT = 40; // 40% maximum per sector
    
    console.log('Starting sector cap calculations...');
    
    // Step 1: Calculate raw sector weights based on market cap
    const sectorMarketCaps: Record<string, number> = {};
    let totalMarketCap = 0;
    
    for (const sectorKey in updatedComposition.sectors) {
      const sector = updatedComposition.sectors[sectorKey];
      let sectorCap = 0;
      
      // Calculate market cap for this sector
      for (const token of sector.tokens) {
        sectorCap += (marketCapData[token] || 0);
      }
      
      sectorMarketCaps[sectorKey] = sectorCap;
      totalMarketCap += sectorCap;
      
      console.log(`Sector: ${sectorKey}, Market Cap: ${sectorCap}, Selected Token: ${sector.selectedToken}`);
    }
    
    console.log(`Total Market Cap across all sectors: ${totalMarketCap}`);
    
    // Step 2: Apply sector caps
    const sectorWeights: Record<string, number> = {};
    
    // First pass - apply caps
    for (const sectorKey in updatedComposition.sectors) {
      const rawWeight = (sectorMarketCaps[sectorKey] / totalMarketCap) * 100;
      sectorWeights[sectorKey] = Math.min(rawWeight, MAX_SECTOR_WEIGHT);
      console.log(`Sector: ${sectorKey}, Raw Weight: ${rawWeight.toFixed(2)}%, Capped Weight: ${sectorWeights[sectorKey].toFixed(2)}%`);
    }
    
    // Ensure minimum weights for small sectors (at least 5%)
    for (const sectorKey in sectorWeights) {
      if (sectorWeights[sectorKey] < 5) {
        sectorWeights[sectorKey] = 5;
        console.log(`Boosting ${sectorKey} to minimum 5%`);
      }
    }
    
    // Calculate total after caps and minimums
    let totalWeight = Object.values(sectorWeights).reduce((sum, weight) => sum + weight, 0);
    console.log(`Total Weight after caps and minimums: ${totalWeight.toFixed(2)}%`);
    
    // Normalize to 100%
    for (const sectorKey in sectorWeights) {
      sectorWeights[sectorKey] = Math.round((sectorWeights[sectorKey] / totalWeight) * 100);
      console.log(`Sector: ${sectorKey}, Normalized Weight: ${sectorWeights[sectorKey]}%`);
    }
    
    // HARD ENFORCE the maximum cap after normalization
    let excessWeight = 0;
    for (const sectorKey in sectorWeights) {
      if (sectorWeights[sectorKey] > MAX_SECTOR_WEIGHT) {
        excessWeight += sectorWeights[sectorKey] - MAX_SECTOR_WEIGHT;
        console.log(`Hard capping ${sectorKey} from ${sectorWeights[sectorKey]}% to ${MAX_SECTOR_WEIGHT}%`);
        sectorWeights[sectorKey] = MAX_SECTOR_WEIGHT;
      }
    }
    
    // Redistribute excess weight to other sectors proportionally
    if (excessWeight > 0) {
      const nonMaxSectors = Object.keys(sectorWeights).filter(key => sectorWeights[key] < MAX_SECTOR_WEIGHT);
      const totalNonMaxWeight = nonMaxSectors.reduce((sum, key) => sum + sectorWeights[key], 0);
      
      for (const sectorKey of nonMaxSectors) {
        const proportion = sectorWeights[sectorKey] / totalNonMaxWeight;
        const addition = Math.round(excessWeight * proportion);
        sectorWeights[sectorKey] += addition;
        console.log(`Adding ${addition}% to ${sectorKey}, new weight: ${sectorWeights[sectorKey]}%`);
      }
    }
    
    // Ensure we sum to exactly 100% by adjusting the largest non-capped allocation if needed
    let finalTotal = Object.values(sectorWeights).reduce((sum, weight) => sum + weight, 0);
    if (finalTotal !== 100) {
      const nonMaxSectors = Object.keys(sectorWeights).filter(key => sectorWeights[key] < MAX_SECTOR_WEIGHT);
      let largestSector = '';
      let largestWeight = 0;
      
      for (const sectorKey of nonMaxSectors) {
        if (sectorWeights[sectorKey] > largestWeight) {
          largestWeight = sectorWeights[sectorKey];
          largestSector = sectorKey;
        }
      }
      
      if (largestSector) {
        sectorWeights[largestSector] += (100 - finalTotal);
        console.log(`Adjusted ${largestSector} by ${100 - finalTotal} to ensure total is 100%`);
      }
    }
    
    // Step 3: Apply sector weights to selected tokens
    for (const sectorKey in updatedComposition.sectors) {
      const sector = updatedComposition.sectors[sectorKey];
      const sectorWeight = sectorWeights[sectorKey];
      
      if (!sector.allocations) {
        sector.allocations = {};
      }
      
      sector.allocations[sector.selectedToken] = sectorWeight;
      console.log(`Setting allocation for ${sector.selectedToken} to ${sectorWeight}%`);
    }
    
    return updatedComposition;
  };

  useEffect(() => {
    const fetchData = async () => {
      console.log("Starting fetchData()");
      setIsLoading(true);
      try {
        // Check for existing topic ID in localStorage
        const savedTopicId = localStorage.getItem('lynx-user-topic-id');
        console.log("Saved topic ID:", savedTopicId);
        if (savedTopicId) {
          setUserTopicId(savedTopicId);
        }
        
        // Fetch composition data
        console.log("Fetching composition data...");
        const response = await fetch('/api/governance/get-composition');
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log("Composition data received:", data);
        setCompositionData(data);
        
        // Initialize desired composition from AI recommendation
        if (data.aiRecommendation) {
          setDesiredComposition({
            sectors: { ...data.aiRecommendation.sectors }
          });
        }
        
        // Fetch consensus data immediately
        console.log("Fetching consensus data...");
        try {
          const consensusResponse = await fetch('/api/governance/get-consensus');
          console.log("Consensus response status:", consensusResponse.status);
          
          if (consensusResponse.ok) {
            const consensusData = await consensusResponse.json();
            console.log("Consensus data received:", consensusData);
            
            if (consensusData.success && consensusData.consensus) {
              console.log("Setting consensus composition:", consensusData.consensus);
              setConsensusComposition(consensusData.consensus);
            } else {
              console.error("Invalid consensus data format:", consensusData);
            }
          } else {
            console.error("Failed to fetch consensus data:", consensusResponse.status);
          }
        } catch (error) {
          console.error('Error fetching consensus:', error);
        }
        
      } catch (error: any) {
        console.error('Error fetching composition data:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Check scroll position after component mounts
    setTimeout(() => {
      checkScrollPosition();
    }, 100);
  }, []);

  const handleTokenChange = (sector: string, newToken: string) => {
    if (!desiredComposition) return;
    
    // Create a deep copy of the composition to avoid reference issues
    const updatedComposition = JSON.parse(JSON.stringify(desiredComposition));
    
    // Update the selected token for this sector
    updatedComposition.sectors[sector].selectedToken = newToken;
    
    // Recalculate allocations based on market cap with sector caps
    const finalComposition = calculateSectorCappedAllocations(updatedComposition);
    
    // Update state with the new composition
    setDesiredComposition(finalComposition);
    setShowVoteButton(true);
    
    console.log('Updated composition:', finalComposition.sectors[sector]);
  };

  const handleAllocationChange = (sector: string, newAllocation: number) => {
    if (!desiredComposition) return;
    
    const updatedComposition = { ...desiredComposition };
    if (updatedComposition.sectors[sector].allocations) {
      updatedComposition.sectors[sector].allocations![updatedComposition.sectors[sector].selectedToken] = newAllocation;
    }
    
    setDesiredComposition(updatedComposition);
    setShowVoteButton(true);
  };

  // Helper function to show alerts with transaction hash
  const showAlert = (message: string, type: "success" | "error" | "warning" | "info" = "info", txId?: string) => {
    console.log(`Showing alert: ${message} (${type}), Transaction ID:`, txId);
    
    // Extract txHash if available
    let txHash = txId;
    if (txId && txId.startsWith('{')) {
      try {
        const txData = JSON.parse(txId);
        if (txData.txHash) {
          txHash = txData.txHash;
        }
      } catch (e) {
        console.error("Error parsing transaction data:", e);
      }
    }
    
    // Create alert content with just the transaction hash
    const alertContent = (
      <div className="flex flex-col">
        <div>{message}</div>
        {txHash && (
          <div className="mt-2 text-xs font-mono bg-gray-800 p-2 rounded overflow-auto">
            Transaction Hash: {txHash}
          </div>
        )}
      </div>
    );
    
    setAlertMessage(alertContent);
    setAlertType(type);
    
    // Clear any existing timeout
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
    }
    
    // Set a timeout to clear the alert
    alertTimeoutRef.current = setTimeout(() => {
      setAlertMessage(null);
    }, 15000);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  const handleVoteSubmit = async () => {
    try {
      if (!userTopicId) {
        throw new Error('No user topic ID found. Please create a user topic first.');
      }
      
      setIsSubmitting(true);
      
      // For demo purposes, use the topic ID as the user ID
      const userId = userTopicId;
      const lynxStake = 1000;
      
      console.log('Using user ID:', userId);
      
      // Submit preference to the actual API endpoint
      const response = await fetch('/api/governance/submit-preferences/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userTopicId,
          userId,
          composition: desiredComposition,
          lynxStake
        }),
      });
      
      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Extract transaction ID from the response
        const txId = data.transactionId;
        console.log("Transaction ID from API:", txId);
        showAlert(`Your preference has been submitted successfully!`, 'success', txId);
        setShowVoteButton(false);
        
        // Fetch the actual consensus data
        try {
          const consensusResponse = await fetch('/api/governance/get-consensus');
          
          if (consensusResponse.ok) {
            const consensusData = await consensusResponse.json();
            
            if (consensusData.success && consensusData.consensus) {
              setConsensusComposition(consensusData.consensus);
            }
          }
        } catch (error) {
          console.error('Error fetching consensus:', error);
        }
      } else {
        throw new Error(data.error || 'Failed to submit preference');
      }
    } catch (error: any) {
      console.error('Error submitting preference:', error);
      showAlert(`Failed to submit preference: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestSector = () => {
    // In a real implementation, this would open a modal or navigate to a form
    alert('This would open a form to suggest a new sector');
  };

  const TokenImage = ({ symbol, size = 80 }: { symbol: string; size?: number }) => {
    const [imageError, setImageError] = useState(false);
    
    if (imageError) {
      return (
        <div 
          className="rounded-full bg-gray-700 flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <span className="text-white font-medium text-sm">
            {symbol.substring(0, 2)}
          </span>
        </div>
      );
    }
    
    return (
      <Image
        src={getTokenIconUrl(symbol)}
        alt={symbol}
        width={size}
        height={size}
        className="object-contain"
        onError={() => setImageError(true)}
      />
    );
  };

  const renderTokenSector = (sectorName: string, sectorData: SectorData, isEditable: boolean = false) => {
    // Round the allocation to a whole number for display
    const allocation = Math.round(sectorData.allocations?.[sectorData.selectedToken] || 0);
    const isNativeToken = sectorName === "Native Token";
    
    // Mock market cap data - in a real app, this would come from an API
    const getMarketCap = (symbol: string): string => {
      const marketCaps: Record<string, string> = {
        'HBAR': '$1.2B',
        'WETH': '$320B',
        'WBTC': '$1.1T',
        'WAVAX': '$8.5B',
        'WSOL': '$42B',
        'SAUCE': '$15M',
        'xSAUCE': '$8M',
        'HBARX': '$120M',
        'HLQT': '$5M',
        'SGB': '$22M',
        'USDC': '$28B',
        'USDT': '$95B',
        'DAI': '$5.2B',
        'HCHF': '$3M',
        'BUSD': '$2.1B',
        'CLXY': '$85M',
        'DOVU': '$12M',
        'HST': '$18M',
        'HBAR+': '$4M',
        'ATMA': '$7M',
        'JAM': '$25M',
        'KARATE': '$9M',
        'PACK': '$14M',
        'GRELF': '$6M',
        'STEAM': '$11M',
      };
      
      return marketCaps[symbol] || 'N/A';
    };
    
    return (
      <div 
        key={sectorName} 
        className={`${isNativeToken ? 'border border-gray-600' : 'bg-gray-800'} rounded-lg p-6 mb-6 flex flex-col items-center justify-between w-[180px] h-[280px]`}
      >
        {isEditable && !isNativeToken ? (
          <div className="relative">
            <div 
              className="flex flex-col items-center cursor-pointer hover:opacity-80"
              onClick={() => document.getElementById(`dropdown-${sectorName}`)?.classList.toggle('hidden')}
            >
              <div className="rounded-full p-2 mb-2 relative">
                <TokenImage symbol={sectorData.selectedToken} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-gray-900/70 rounded-full w-full h-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-white font-medium">{sectorData.selectedToken}</div>
              </div>
            </div>
            
            <div 
              id={`dropdown-${sectorName}`} 
              className="absolute z-10 hidden bg-gray-700 rounded-lg shadow-lg mt-2 py-1 w-48 left-1/2 transform -translate-x-1/2"
            >
              {sectorData.tokens.map(token => (
                <button
                  key={token}
                  className={`block px-4 py-2 text-sm text-white hover:bg-gray-600 w-full text-left ${
                    token === sectorData.selectedToken ? 'bg-gray-600' : ''
                  }`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    handleTokenChange(sectorName, token);
                    document.getElementById(`dropdown-${sectorName}`)?.classList.add('hidden');
                  }}
                >
                  <div className="flex items-center">
                    <TokenImage symbol={token} size={24} />
                    <span className="ml-2">{token}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="rounded-full p-2 mb-2">
              <TokenImage symbol={sectorData.selectedToken} />
            </div>
            <div className="text-center">
              <div className="text-white font-medium">{sectorData.selectedToken}</div>
            </div>
          </div>
        )}
        
        <h3 className="text-sm text-gray-400 font-normal text-center min-h-[40px] flex items-center">{sectorName}</h3>
        
        {/* Market Cap and Allocation Info */}
        <div className="w-full mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Market Cap</span>
            <span className="text-white">{getMarketCap(sectorData.selectedToken)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Allocation</span>
            <span className="text-white">{allocation}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderSuggestSectorBox = () => {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-6 flex flex-col items-center justify-between cursor-pointer w-[180px] h-[280px]" onClick={handleSuggestSector}>
        <div className="border-2 border-dashed border-purple-500 rounded-full p-3 flex items-center justify-center" style={{ width: '80px', height: '80px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        
        <div className="text-center">
          <div className="text-purple-400 font-medium">Add Sector</div>
        </div>
        
        <h3 className="text-sm text-gray-400 font-normal text-center min-h-[40px] flex items-center">Suggest New Sector</h3>
      </div>
    );
  };

  // Add this function to check scroll position and show/hide buttons accordingly
  const checkScrollPosition = () => {
    const container = document.getElementById('composition-carousel');
    const leftButton = document.getElementById('carousel-left-button');
    const rightButton = document.getElementById('carousel-right-button');
    
    if (container && leftButton && rightButton) {
      // Check if at the start
      if (container.scrollLeft <= 10) {
        leftButton.classList.add('hidden');
      } else {
        leftButton.classList.remove('hidden');
      }
      
      // Check if at the end
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 10;
      if (isAtEnd) {
        rightButton.classList.add('hidden');
      } else {
        rightButton.classList.remove('hidden');
      }
    }
  };

  // Call this function on initial render to set correct button visibility
  useEffect(() => {
    if (desiredComposition) {
      setTimeout(() => {
        checkScrollPosition();
      }, 100);
    }
  }, [desiredComposition]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mx-auto my-8 max-w-2xl text-white">
        {error}
      </div>
    );
  }

  console.log("Rendering with consensusComposition:", consensusComposition);

  return (
    <div className="min-h-screen text-white">
      <TestnetAlert />
      <GovernanceNav currentSection="composition" />
      
      {/* Add DAO Test Controls in development mode */}
      {process.env.NODE_ENV !== 'production' && !userTopicId && (
        <div className="container mx-auto px-4 mt-4">
          <DaoTestControls onPreferenceSubmit={(topicId) => {
            console.log('User topic created:', topicId);
            setUserTopicId(topicId);
            localStorage.setItem('lynx-user-topic-id', topicId);
            showAlert(`User topic created: ${topicId}`, 'success');
          }} />
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8">
        {alertMessage && (
          <div className="fixed bottom-4 left-4 z-50 max-w-md">
            <Alert 
              className="mb-4 shadow-lg" 
              color={alertType === "error" ? "danger" : alertType}
              onClose={() => setAlertMessage(null)}
            >
              {alertMessage}
            </Alert>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-8">
          {/* AI Recommended Composition */}
          <div className="mb-8">
            <h2 className={`text-xl text-white mb-6 ${vt323.className}`}>AI Recommended Composition</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full pr-0">
              {compositionData?.aiRecommendation && Object.entries(compositionData.aiRecommendation.sectors).map(([sectorName, sectorData]) => (
                renderTokenSector(sectorName, sectorData)
              ))}
            </div>
            
            <div className="mt-6 bg-blue-900/30 border border-blue-800 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-white mb-2">AI Reasoning</h3>
              <p className="text-gray-300">
                {compositionData?.aiRecommendation?.reasoning || 
                  "Our AI analysis suggests this composition based on current market conditions, token performance, and ecosystem developments."}
              </p>
            </div>
          </div>
          
          {/* Current Composition with improved horizontal carousel */}
          <div className="mb-8">
            <h2 className={`text-xl text-white mb-6 ${vt323.className}`}>Current Composition</h2>
            
            <div className="relative group">
              {/* Left scroll button - positioned at 40% from top */}
              <div 
                id="carousel-left-button"
                className="absolute left-0 z-10 px-2 opacity-0 group-hover:opacity-100 transition-opacity hidden"
                style={{ top: '40%' }} // Position at 40% from the top
              >
                <button 
                  className="bg-gray-900/80 rounded-full p-2 text-white"
                  onClick={() => {
                    const container = document.getElementById('composition-carousel');
                    if (container) {
                      container.scrollBy({ left: -200, behavior: 'smooth' });
                      
                      // Check if we're at the start after scrolling
                      setTimeout(() => {
                        checkScrollPosition();
                      }, 500);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              
              {/* Carousel container */}
              <div 
                id="composition-carousel"
                className="flex overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={() => checkScrollPosition()}
              >
                {desiredComposition && Object.entries(desiredComposition.sectors).map(([sectorName, sectorData]) => (
                  <div key={sectorName} className="snap-start flex-shrink-0 mr-4">
                    {renderTokenSector(sectorName, sectorData, true)}
                  </div>
                ))}
                <div className="snap-start flex-shrink-0">
                  {renderSuggestSectorBox()}
                </div>
              </div>
              
              {/* Right scroll button - positioned at 40% from top */}
              <div 
                id="carousel-right-button"
                className="absolute right-0 z-10 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ top: '40%' }} // Position at 40% from the top
              >
                <button 
                  className="bg-gray-900/80 rounded-full p-2 text-white"
                  onClick={() => {
                    const container = document.getElementById('composition-carousel');
                    if (container) {
                      container.scrollBy({ left: 200, behavior: 'smooth' });
                      
                      // Check if we're at the end after scrolling
                      setTimeout(() => {
                        checkScrollPosition();
                      }, 500);
                    }
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Add CSS to hide scrollbar and handle button visibility */}
            <style jsx global>{`
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}</style>
            
            {showVoteButton && (
              <div className="flex justify-end mt-4">
                <button 
                  onClick={handleVoteSubmit}
                  disabled={isSubmitting}
                  className={`border border-white text-white py-1 px-4 rounded-md text-sm font-medium hover:bg-white/10 transition-colors ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Vote'}
                </button>
              </div>
            )}
          </div>
          
          {/* Add Consensus Composition section */}
          {consensusComposition && (
            <div className="mb-8">
              <h2 className={`text-xl text-white mb-6 ${vt323.className}`}>DAO Consensus Composition</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 w-full pr-0">
                {Object.entries(consensusComposition.sectors).map(([sectorName, sectorData]) => (
                  renderTokenSector(sectorName, sectorData as SectorData)
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <DaoTestControls 
        onPreferenceSubmit={(topicId) => {
          console.log('User topic created:', topicId);
          setUserTopicId(topicId);
          localStorage.setItem('lynx-user-topic-id', topicId);
          showAlert(`User topic created: ${topicId}`, 'success');
        }}
      />
    </div>
  );
} 