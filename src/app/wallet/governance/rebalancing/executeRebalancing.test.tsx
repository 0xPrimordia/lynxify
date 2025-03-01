import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import RebalancingPage from './page';
import { SupabaseProvider } from '@/app/hooks/useSupabase';

// Mock fetch
global.fetch = jest.fn();

// Mock the useSupabase hook
jest.mock('@/app/hooks/useSupabase', () => ({
  useSupabase: jest.fn().mockReturnValue({
    supabase: {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
      }
    }
  }),
  SupabaseProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('Rebalancing Execution UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful fetch for initial data
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/ai/rebalance') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            currentRatios: { hbar: 0.33, sauce: 0.33, clxy: 0.34 },
            marketConditions: {
              prices: { hbar: 0.07, sauce: 0.004, clxy: 0.002 },
              volatility: { hbar: 0.05, sauce: 0.12, clxy: 0.18 },
              liquidity: { hbar: 1000000, sauce: 500000, clxy: 250000 }
            },
            lastRebalanced: '2023-05-01'
          })
        });
      }
      
      if (url === '/api/ai/rebalance/history?limit=5') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [] })
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  it('should execute rebalancing when Apply Recommendation button is clicked', async () => {
    // Arrange
    render(
      <SupabaseProvider>
        <RebalancingPage />
      </SupabaseProvider>
    );
    
    // Wait for initial data to load and loading state to clear
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
    });
    
    // Check if the Request Analysis button is present
    await waitFor(() => {
      expect(screen.getByText('Request Analysis')).toBeInTheDocument();
    });
    
    // Mock AI analysis response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url === '/api/ai/rebalance/analyze') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            requestId: 'test-request-id',
            recommendation: {
              newRatios: { HBAR: 0.4, SAUCE: 0.3, CLXY: 0.3 },
              confidence: 0.85,
              reasoning: ['Market volatility decreased', 'HBAR liquidity improved']
            },
            volatilityTrend: 'decreasing',
            liquidityTrend: 'improving',
            dataPoints: 120,
            transactionId: 'recorded-on-hcs'
          })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Unexpected URL' })
      });
    });
    
    // Request AI analysis
    fireEvent.click(screen.getByText('Request Analysis'));
    
    // Wait for analysis to complete and loading state to clear
    await waitFor(() => {
      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
    });
    
    // Mock execution response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url === '/api/governance/rebalance/execute') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            transactionId: 'mock-transaction-id',
            executionTime: new Date().toISOString(),
            message: 'Rebalancing executed successfully',
            newRatios: { hbar: 0.4, sauce: 0.3, clxy: 0.3 }
          })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Unexpected URL' })
      });
    });
    
    // Execute rebalancing
    fireEvent.click(screen.getByText('Execute Rebalancing'));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Rebalancing executed successfully!')).toBeInTheDocument();
    });
    
    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/governance/rebalance/execute',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: expect.any(String)
      })
    );
    
    // Verify the body contains the correct data
    const fetchCalls = (global.fetch as jest.Mock).mock.calls;
    const executeCall = fetchCalls.find(call => call[0] === '/api/governance/rebalance/execute');
    const requestBody = JSON.parse(executeCall[1].body);
    
    expect(requestBody).toEqual({
      requestId: 'test-request-id',
      previousRatios: { hbar: 0.33, sauce: 0.33, clxy: 0.34 },
      newRatios: { hbar: 0.4, sauce: 0.3, clxy: 0.3 },
      confidence: 0.85,
      reasoning: ['Market volatility decreased', 'HBAR liquidity improved']
    });
  });

  it('should handle execution errors', async () => {
    // Arrange
    render(
      <SupabaseProvider>
        <RebalancingPage />
      </SupabaseProvider>
    );
    
    // Wait for initial data to load and loading state to clear
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
    });
    
    // Check if the Request Analysis button is present
    await waitFor(() => {
      expect(screen.getByText('Request Analysis')).toBeInTheDocument();
    });
    
    // Mock AI analysis response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url === '/api/ai/rebalance/analyze') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            requestId: 'test-request-id',
            recommendation: {
              newRatios: { HBAR: 0.4, SAUCE: 0.3, CLXY: 0.3 },
              confidence: 0.85,
              reasoning: ['Market volatility decreased', 'HBAR liquidity improved']
            },
            volatilityTrend: 'decreasing',
            liquidityTrend: 'improving',
            dataPoints: 120,
            transactionId: 'recorded-on-hcs'
          })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Unexpected URL' })
      });
    });
    
    // Request AI analysis
    fireEvent.click(screen.getByText('Request Analysis'));
    
    // Wait for analysis to complete and loading state to clear
    await waitFor(() => {
      expect(screen.queryByText('Analyzing...')).not.toBeInTheDocument();
    });
    
    // Mock execution error response
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url === '/api/governance/rebalance/execute') {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({
            error: 'Failed to execute rebalancing'
          })
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Unexpected URL' })
      });
    });
    
    // Execute rebalancing
    fireEvent.click(screen.getByText('Execute Rebalancing'));
    
    // Assert
    await waitFor(() => {
      expect(screen.getByText('Failed to execute rebalancing')).toBeInTheDocument();
    });
  });
}); 