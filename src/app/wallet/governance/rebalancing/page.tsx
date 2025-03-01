'use client';

import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import { useSupabase } from '@/app/hooks/useSupabase';
import GovernanceNav from '@/app/components/GovernanceNav';
import TestnetAlert from '@/app/components/TestnetAlert';

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

export default function RebalancingPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [rebalancingData, setRebalancingData] = useState<RebalancingData | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<AIRecommendation | null>(null);
  const [rebalancingHistory, setRebalancingHistory] = useState<HistoricalRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const { supabase } = useSupabase();
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionSuccess, setExecutionSuccess] = useState<boolean>(false);

  const fetchRebalancingHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await fetch('/api/ai/rebalance/history?limit=5');
      if (!response.ok) {
        throw new Error('Failed to fetch rebalancing history');
      }
      
      const data = await response.json();
      setRebalancingHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching rebalancing history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const fetchRebalancingData = async () => {
      try {
        const response = await fetch('/api/ai/rebalance');
        if (!response.ok) {
          throw new Error('Failed to fetch rebalancing data');
        }
        
        const data = await response.json();
        if (!data || !data.currentRatios || !data.marketConditions) {
          throw new Error('Invalid data structure received from API');
        }
        setRebalancingData(data);
      } catch (error) {
        console.error('Error fetching rebalancing data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load rebalancing data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRebalancingData();
  }, []);
  
  useEffect(() => {
    fetchRebalancingHistory();
  }, [aiRecommendation]); // Refetch history when a new recommendation is made
  
  useEffect(() => {
    if (chartContainerRef.current && rebalancingHistory.length > 0) {
      // Clear previous chart if it exists
      if (chartRef.current) {
        chartRef.current.remove();
        chartContainerRef.current.innerHTML = '';
      }
      
      // Create new chart
      const chart = createChart(chartContainerRef.current, {
        layout: {
          background: { color: '#1f2937' },
          textColor: '#d1d5db',
        },
        grid: {
          vertLines: { color: '#374151' },
          horzLines: { color: '#374151' },
        },
        width: chartContainerRef.current.clientWidth,
        height: 300,
      });
      
      // Add series for each token
      const hbarSeries = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        title: 'HBAR',
      });
      
      const sauceSeries = chart.addLineSeries({
        color: '#10b981',
        lineWidth: 2,
        title: 'SAUCE',
      });
      
      const clxySeries = chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 2,
        title: 'CLXY',
      });
      
      // Prepare data for chart
      const sortedHistory = [...rebalancingHistory].sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      const hbarData = sortedHistory.map(rec => ({
        time: new Date(rec.timestamp).getTime() / 1000 as any,
        value: rec.ratios.hbar,
      }));
      
      const sauceData = sortedHistory.map(rec => ({
        time: new Date(rec.timestamp).getTime() / 1000 as any,
        value: rec.ratios.sauce,
      }));
      
      const clxyData = sortedHistory.map(rec => ({
        time: new Date(rec.timestamp).getTime() / 1000 as any,
        value: rec.ratios.clxy,
      }));
      
      // Set data for each series
      hbarSeries.setData(hbarData);
      sauceSeries.setData(sauceData);
      clxySeries.setData(clxyData);
      
      // Add current recommendation if available
      if (aiRecommendation) {
        const currentTime = new Date().getTime() / 1000 as any;
        
        hbarSeries.update({
          time: currentTime,
          value: aiRecommendation.ratios.hbar,
        });
        
        sauceSeries.update({
          time: currentTime,
          value: aiRecommendation.ratios.sauce,
        });
        
        clxySeries.update({
          time: currentTime,
          value: aiRecommendation.ratios.clxy,
        });
      }
      
      // Fit content
      chart.timeScale().fitContent();
      
      // Save chart reference
      chartRef.current = chart;
    }
  }, [rebalancingHistory, aiRecommendation]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, []);
  
  const requestAIAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Default values if rebalancingData is null
      const defaultRatios: TokenRatios = {
        hbar: 0.33333,
        sauce: 0.33333,
        clxy: 0.33333
      };
      
      const defaultMarketConditions: MarketConditions = {
        prices: {
          hbar: 0.068,
          sauce: 0.0042,
          clxy: 0.0015
        },
        volatility: {
          hbar: 0.052,
          sauce: 0.127,
          clxy: 0.183
        },
        liquidity: {
          hbar: 1000000,
          sauce: 500000,
          clxy: 250000
        }
      };
      
      // Make sure we have valid data to send
      const currentRatios = rebalancingData?.currentRatios || defaultRatios;
      const marketConditions = rebalancingData?.marketConditions || defaultMarketConditions;
      
      const response = await fetch('/api/ai/rebalance/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentRatios,
          marketConditions
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI analysis');
      }
      
      const data = await response.json();
      
      // Transform the data to match the expected format
      const transformedData: AIRecommendation = {
        ratios: {
          hbar: data.recommendation?.newRatios?.HBAR || 0,
          sauce: data.recommendation?.newRatios?.SAUCE || 0,
          clxy: data.recommendation?.newRatios?.CLXY || 0
        },
        confidence: data.recommendation?.confidence || 0,
        reasoning: data.recommendation?.reasoning || [],
        volatilityTrend: "moderate", // Default value or extract from data if available
        liquidityTrend: "stable", // Default value or extract from data if available
        dataPoints: 100, // Default value or extract from data if available
        timestamp: new Date().toISOString(),
        requestId: data.requestId,
        topicId: data.topicId,
        transactionId: data.transactionId
      };
      
      setAiRecommendation(transformedData);
    } catch (err) {
      console.error('AI analysis error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const executeRebalancing = async () => {
    if (!aiRecommendation || !rebalancingData) return;
    
    try {
      setIsExecuting(true);
      
      const response = await fetch('/api/governance/rebalance/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: aiRecommendation.requestId || `req-${Date.now()}`,
          previousRatios: rebalancingData.currentRatios,
          newRatios: aiRecommendation.ratios,
          confidence: aiRecommendation.confidence,
          reasoning: aiRecommendation.reasoning
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute rebalancing');
      }
      
      const data = await response.json();
      
      // Update the local state with the new ratios
      setRebalancingData({
        ...rebalancingData,
        currentRatios: aiRecommendation.ratios,
        lastRebalanced: new Date().toISOString()
      });
      
      // Show success message
      setExecutionSuccess(true);
      
      // Refresh history after execution
      fetchRebalancingHistory();
      
      // Clear the success message after a delay
      setTimeout(() => {
        setExecutionSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error('Rebalancing execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute rebalancing');
    } finally {
      setIsExecuting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full">
        <TestnetAlert />
        <GovernanceNav currentSection="rebalancing" />
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <TestnetAlert />
        <GovernanceNav currentSection="rebalancing" />
        <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded mb-6">
          {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <TestnetAlert />
      <GovernanceNav currentSection="rebalancing" />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">Current Market Conditions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-2 text-white">Token Prices</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">HBAR</div>
                  <div className="text-2xl font-bold text-white">
                    ${rebalancingData?.marketConditions.prices.hbar.toFixed(4)}
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">SAUCE</div>
                  <div className="text-2xl font-bold text-white">
                    ${rebalancingData?.marketConditions.prices.sauce.toFixed(4)}
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">CLXY</div>
                  <div className="text-2xl font-bold text-white">
                    ${rebalancingData?.marketConditions.prices.clxy.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2 text-white">Volatility</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">HBAR</div>
                  <div className="text-2xl font-bold text-white">
                    {((rebalancingData?.marketConditions?.volatility?.hbar ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">SAUCE</div>
                  <div className="text-2xl font-bold text-white">
                    {((rebalancingData?.marketConditions?.volatility?.sauce ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">CLXY</div>
                  <div className="text-2xl font-bold text-white">
                    {((rebalancingData?.marketConditions?.volatility?.clxy ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2 text-white">Current Composition</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">HBAR</div>
                  <div className="text-2xl font-bold text-white">
                    {((rebalancingData?.currentRatios?.hbar ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">SAUCE</div>
                  <div className="text-2xl font-bold text-white">
                    {((rebalancingData?.currentRatios?.sauce ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm text-gray-400">CLXY</div>
                  <div className="text-2xl font-bold text-white">
                    {((rebalancingData?.currentRatios?.clxy ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-white">AI Rebalancing Analysis</h2>
          
          <div className="mb-4">
            <p className="text-gray-300 mb-4">
              Request an AI analysis to get recommendations for optimal token ratios based on current market conditions.
            </p>
            <div className="flex justify-center">
              <button
                onClick={requestAIAnalysis}
                disabled={isAnalyzing}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <span className="flex items-center">
                    <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></span>
                    Analyzing...
                  </span>
                ) : (
                  'Request Analysis'
                )}
              </button>
            </div>
            
            {aiRecommendation && (
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-2 text-white">AI Recommendation</h3>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Confidence</div>
                      <div className="text-2xl font-bold text-white">
                        {aiRecommendation.confidence !== undefined ? 
                          `${(aiRecommendation.confidence * 100).toFixed(0)}%` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Data Points</div>
                      <div className="text-2xl font-bold text-white">{aiRecommendation.dataPoints || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Volatility Trend</div>
                      <div className="text-2xl font-bold text-white">{aiRecommendation.volatilityTrend || 'N/A'}</div>
                    </div>
                  </div>
                  
                  {aiRecommendation.ratios && (
                    <>
                      <div className="text-sm text-gray-400 mb-2">Recommended Composition</div>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-gray-700 p-4 rounded-lg">
                          <div className="text-sm text-gray-400">HBAR</div>
                          <div className="text-2xl font-bold text-white">
                            {aiRecommendation.ratios.hbar !== undefined ? 
                              `${(aiRecommendation.ratios.hbar * 100).toFixed(1)}%` : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-400 mt-2">
                            {aiRecommendation.ratios.hbar !== undefined && rebalancingData?.currentRatios?.hbar !== undefined ? (
                              <span className={aiRecommendation.ratios.hbar > rebalancingData.currentRatios.hbar ? 
                                "text-green-400" : aiRecommendation.ratios.hbar < rebalancingData.currentRatios.hbar ? 
                                "text-red-400" : "text-gray-400"}>
                                {aiRecommendation.ratios.hbar > rebalancingData.currentRatios.hbar ? 
                                  `+${((aiRecommendation.ratios.hbar - rebalancingData.currentRatios.hbar) * 100).toFixed(1)}%` : 
                                  aiRecommendation.ratios.hbar < rebalancingData.currentRatios.hbar ? 
                                  `${((aiRecommendation.ratios.hbar - rebalancingData.currentRatios.hbar) * 100).toFixed(1)}%` : 
                                  'No change'}
                              </span>
                            ) : 'N/A'}
                          </div>
                        </div>
                        
                        <div className="bg-gray-700 p-4 rounded-lg">
                          <div className="text-sm text-gray-400">SAUCE</div>
                          <div className="text-2xl font-bold text-white">
                            {aiRecommendation.ratios.sauce !== undefined ? 
                              `${(aiRecommendation.ratios.sauce * 100).toFixed(1)}%` : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-400 mt-2">
                            {aiRecommendation.ratios.sauce !== undefined && rebalancingData?.currentRatios?.sauce !== undefined ? (
                              <span className={aiRecommendation.ratios.sauce > rebalancingData.currentRatios.sauce ? 
                                "text-green-400" : aiRecommendation.ratios.sauce < rebalancingData.currentRatios.sauce ? 
                                "text-red-400" : "text-gray-400"}>
                                {aiRecommendation.ratios.sauce > rebalancingData.currentRatios.sauce ? 
                                  `+${((aiRecommendation.ratios.sauce - rebalancingData.currentRatios.sauce) * 100).toFixed(1)}%` : 
                                  aiRecommendation.ratios.sauce < rebalancingData.currentRatios.sauce ? 
                                  `${((aiRecommendation.ratios.sauce - rebalancingData.currentRatios.sauce) * 100).toFixed(1)}%` : 
                                  'No change'}
                              </span>
                            ) : 'N/A'}
                          </div>
                        </div>
                        
                        <div className="bg-gray-700 p-4 rounded-lg">
                          <div className="text-sm text-gray-400">CLXY</div>
                          <div className="text-2xl font-bold text-white">
                            {aiRecommendation.ratios.clxy !== undefined ? 
                              `${(aiRecommendation.ratios.clxy * 100).toFixed(1)}%` : 'N/A'}
                          </div>
                          <div className="text-sm text-gray-400 mt-2">
                            {aiRecommendation.ratios.clxy !== undefined && rebalancingData?.currentRatios?.clxy !== undefined ? (
                              <span className={aiRecommendation.ratios.clxy > rebalancingData.currentRatios.clxy ? 
                                "text-green-400" : aiRecommendation.ratios.clxy < rebalancingData.currentRatios.clxy ? 
                                "text-red-400" : "text-gray-400"}>
                                {aiRecommendation.ratios.clxy > rebalancingData.currentRatios.clxy ? 
                                  `+${((aiRecommendation.ratios.clxy - rebalancingData.currentRatios.clxy) * 100).toFixed(1)}%` : 
                                  aiRecommendation.ratios.clxy < rebalancingData.currentRatios.clxy ? 
                                  `${((aiRecommendation.ratios.clxy - rebalancingData.currentRatios.clxy) * 100).toFixed(1)}%` : 
                                  'No change'}
                              </span>
                            ) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* Reasoning */}
                  {aiRecommendation.reasoning && aiRecommendation.reasoning.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Reasoning</div>
                      <ul className="list-disc pl-5 text-gray-300 space-y-1">
                        {aiRecommendation.reasoning.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Execute Button */}
                  <div className="mt-6">
                    <button
                      onClick={executeRebalancing}
                      disabled={isExecuting || !aiRecommendation || !rebalancingData}
                      className={`w-full py-2 px-4 rounded font-medium ${
                        isExecuting || !aiRecommendation || !rebalancingData
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isExecuting ? (
                        <span className="flex items-center justify-center">
                          <span className="animate-spin h-4 w-4 mr-2 border-2 border-t-transparent border-white rounded-full"></span>
                          Executing...
                        </span>
                      ) : (
                        'Execute Rebalancing'
                      )}
                    </button>
                    
                    {executionSuccess && (
                      <div className="mt-2 text-center text-green-400">
                        Rebalancing executed successfully!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
  );
} 