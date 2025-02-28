'use client';

import { useState, useEffect, useRef } from 'react';
import { useSupabase } from '@/app/hooks/useSupabase';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface TokenRatios {
  hbar: number;
  sauce: number;
  clxy: number;
}

interface TokenData {
  currentRatios: TokenRatios;
  marketData: {
    prices: {
      hbar: number;
      sauce: number;
      clxy: number;
    };
    change24h: {
      hbar: number;
      sauce: number;
      clxy: number;
    };
    marketCap: {
      hbar: number;
      sauce: number;
      clxy: number;
    };
  };
  historicalRatios: {
    date: string;
    ratios: TokenRatios;
  }[];
}

export default function CompositionPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [simulatedRatios, setSimulatedRatios] = useState<TokenRatios>({
    hbar: 0.33333,
    sauce: 0.33333,
    clxy: 0.33334
  });
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { supabase } = useSupabase();
  const [chartData, setChartData] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        // In a real implementation, this would fetch from an API
        // For now, we'll use mock data
        const mockData: TokenData = {
          currentRatios: {
            hbar: 0.33333,
            sauce: 0.33333,
            clxy: 0.33333
          },
          marketData: {
            prices: {
              hbar: 0.068,
              sauce: 0.0042,
              clxy: 0.0015
            },
            change24h: {
              hbar: 2.5,
              sauce: -1.2,
              clxy: 5.7
            },
            marketCap: {
              hbar: 2100000000,
              sauce: 42000000,
              clxy: 15000000
            }
          },
          historicalRatios: [
            {
              date: '2023-05-01',
              ratios: { hbar: 0.33333, sauce: 0.33333, clxy: 0.33333 }
            },
            {
              date: '2023-06-15',
              ratios: { hbar: 0.4, sauce: 0.35, clxy: 0.25 }
            }
          ]
        };
        
        setTokenData(mockData);
        setSimulatedRatios(mockData.currentRatios);
      } catch (error) {
        console.error('Error fetching token data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load token data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenData();
  }, []);

  useEffect(() => {
    if (tokenData?.currentRatios) {
      setChartData([
        { name: 'HBAR', value: tokenData.currentRatios.hbar },
        { name: 'SAUCE', value: tokenData.currentRatios.sauce },
        { name: 'CLXY', value: tokenData.currentRatios.clxy }
      ]);
    }
  }, [tokenData]);

  const handleRatioChange = (token: keyof TokenRatios, value: number) => {
    if (!simulatedRatios) return;
    
    // Calculate how much we need to adjust the other tokens
    const currentValue = simulatedRatios[token];
    const difference = value - currentValue;
    
    // Adjust other tokens proportionally
    const otherTokens = Object.keys(simulatedRatios).filter(
      t => t !== token
    ) as Array<keyof TokenRatios>;
    
    const totalOtherValue = otherTokens.reduce(
      (sum, t) => sum + simulatedRatios[t], 
      0
    );
    
    const newRatios = { ...simulatedRatios };
    newRatios[token] = value;
    
    // Distribute the difference proportionally among other tokens
    otherTokens.forEach(t => {
      const proportion = simulatedRatios[t] / totalOtherValue;
      newRatios[t] = Math.max(0, simulatedRatios[t] - (difference * proportion));
    });
    
    // Normalize to ensure sum is 1
    const sum = Object.values(newRatios).reduce((a, b) => a + b, 0);
    Object.keys(newRatios).forEach(t => {
      newRatios[t as keyof TokenRatios] = newRatios[t as keyof TokenRatios] / sum;
    });
    
    setSimulatedRatios(newRatios);
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Token Composition</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-white mb-4">Current Composition</h2>
          <div className="mb-6">
            <div ref={containerRef} className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-gray-400">HBAR</div>
              <div className="text-xl font-semibold text-white">
                {(tokenData?.currentRatios.hbar ?? 0) * 100}%
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-gray-400">SAUCE</div>
              <div className="text-xl font-semibold text-white">
                {(tokenData?.currentRatios.sauce ?? 0) * 100}%
              </div>
            </div>
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="text-sm text-gray-400">CLXY</div>
              <div className="text-xl font-semibold text-white">
                {(tokenData?.currentRatios.clxy ?? 0) * 100}%
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Market Data</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left py-2 text-gray-300">Token</th>
                  <th className="text-left py-2 text-gray-300">Price</th>
                  <th className="text-left py-2 text-gray-300">24h Change</th>
                  <th className="text-left py-2 text-gray-300">Market Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                <tr>
                  <td className="py-3 text-gray-300">HBAR</td>
                  <td className="py-3 text-gray-300">${tokenData?.marketData.prices.hbar.toFixed(4)}</td>
                  <td className={`py-3 ${(tokenData?.marketData.change24h.hbar ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(tokenData?.marketData.change24h.hbar ?? 0) >= 0 ? '+' : ''}
                    {tokenData?.marketData.change24h.hbar.toFixed(2)}%
                  </td>
                  <td className="py-3 text-gray-300">${((tokenData?.marketData.marketCap.hbar ?? 0) / 1000000).toFixed(0)}M</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">SAUCE</td>
                  <td className="py-3 text-gray-300">${tokenData?.marketData.prices.sauce.toFixed(4)}</td>
                  <td className={`py-3 ${(tokenData?.marketData.change24h.sauce ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(tokenData?.marketData.change24h.sauce ?? 0) >= 0 ? '+' : ''}
                    {tokenData?.marketData.change24h.sauce.toFixed(2)}%
                  </td>
                  <td className="py-3 text-gray-300">${((tokenData?.marketData.marketCap.sauce ?? 0) / 1000000).toFixed(0)}M</td>
                </tr>
                <tr>
                  <td className="py-3 text-gray-300">CLXY</td>
                  <td className="py-3 text-gray-300">${tokenData?.marketData.prices.clxy.toFixed(4)}</td>
                  <td className={`py-3 ${(tokenData?.marketData.change24h.clxy ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(tokenData?.marketData.change24h.clxy ?? 0) >= 0 ? '+' : ''}
                    {tokenData?.marketData.change24h.clxy.toFixed(2)}%
                  </td>
                  <td className="py-3 text-gray-300">${((tokenData?.marketData.marketCap.clxy ?? 0) / 1000000).toFixed(0)}M</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Composition Simulator</h2>
          <p className="text-gray-300 mb-4">
            Adjust the sliders to simulate different token compositions and see how they would affect the index.
          </p>
          
          <div className="space-y-6 mt-6">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-300">HBAR</span>
                <span className="font-medium text-white">
                  {simulatedRatios ? (simulatedRatios.hbar * 100).toFixed(1) : 0}%
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={simulatedRatios?.hbar ?? 0.33333}
                onChange={(e) => handleRatioChange('hbar', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-300">SAUCE</span>
                <span className="font-medium text-white">
                  {simulatedRatios ? (simulatedRatios.sauce * 100).toFixed(1) : 0}%
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={simulatedRatios?.sauce ?? 0.33333}
                onChange={(e) => handleRatioChange('sauce', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-gray-300">CLXY</span>
                <span className="font-medium text-white">
                  {simulatedRatios ? (simulatedRatios.clxy * 100).toFixed(1) : 0}%
                </span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01" 
                value={simulatedRatios?.clxy ?? 0.33333}
                onChange={(e) => handleRatioChange('clxy', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-3 text-white">Simulation Results</h3>
            
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">Volatility Estimate</div>
                  <div className="text-xl font-semibold text-white">
                    {simulatedRatios ? (
                      (simulatedRatios.hbar * 0.05 + 
                       simulatedRatios.sauce * 0.12 + 
                       simulatedRatios.clxy * 0.18) * 100
                    ).toFixed(2) : 0}%
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400">Expected Return</div>
                  <div className="text-xl font-semibold text-green-400">
                    {simulatedRatios ? (
                      (simulatedRatios.hbar * 0.025 + 
                       simulatedRatios.sauce * -0.012 + 
                       simulatedRatios.clxy * 0.057) * 100
                    ).toFixed(2) : 0}%
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400">Liquidity Score</div>
                  <div className="text-xl font-semibold text-white">
                    {simulatedRatios ? (
                      (simulatedRatios.hbar * 10 + 
                       simulatedRatios.sauce * 7 + 
                       simulatedRatios.clxy * 5) / 10
                    ).toFixed(1) : 0}/10
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-400">Risk Assessment</div>
                  <div className="text-xl font-semibold text-white">
                    {simulatedRatios ? 
                      (simulatedRatios.hbar > 0.5 ? 'Low' : 
                       simulatedRatios.clxy > 0.4 ? 'High' : 'Moderate') 
                      : 'Moderate'}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-600">
                <button 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
                  onClick={() => {
                    // In a real app, this would create a proposal
                    alert('This would create a governance proposal with your suggested ratios');
                  }}
                >
                  Create Proposal with These Ratios
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-gray-800 rounded-lg p-6 shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Historical Composition</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left py-2 text-gray-300">Date</th>
                <th className="text-left py-2 text-gray-300">HBAR</th>
                <th className="text-left py-2 text-gray-300">SAUCE</th>
                <th className="text-left py-2 text-gray-300">CLXY</th>
                <th className="text-left py-2 text-gray-300">Change Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tokenData?.historicalRatios.map((item, index) => (
                <tr key={index}>
                  <td className="py-3 text-gray-300">{item.date}</td>
                  <td className="py-3 text-gray-300">{(item.ratios.hbar * 100).toFixed(1)}%</td>
                  <td className="py-3 text-gray-300">{(item.ratios.sauce * 100).toFixed(1)}%</td>
                  <td className="py-3 text-gray-300">{(item.ratios.clxy * 100).toFixed(1)}%</td>
                  <td className="py-3 text-gray-300">
                    {index === 0 ? 'Initial Composition' : 'Governance Vote #1'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 