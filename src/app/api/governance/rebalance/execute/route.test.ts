import { NextRequest, NextResponse } from 'next/server';
import { POST } from './route';
import { HCSService } from '@/services/hcsService';

// Mock NextRequest and NextResponse
jest.mock('next/server', () => {
  const mockJson = jest.fn().mockImplementation((body, init) => ({
    status: init?.status || 200,
    body,
    json: async () => body,
    headers: new Headers()
  }));

  return {
    NextRequest: jest.fn().mockImplementation((url, options = {}) => ({
      url,
      method: options.method || 'GET',
      headers: new Headers(options.headers || {}),
      json: async () => options.body ? JSON.parse(options.body) : {},
      nextUrl: { searchParams: new URLSearchParams() }
    })),
    NextResponse: {
      json: mockJson
    }
  };
});

// Mock HCSService
jest.mock('@/services/hcsService');

describe('Rebalance Execute API', () => {
  let mockSubmitMessage: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    // Store original environment
    originalEnv = { ...process.env };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    process.env.LYNX_REBALANCING_TOPIC_ID = 'mock-topic-id';
    process.env.NEXT_PUBLIC_OPERATOR_ID = 'mock-operator-id';
    process.env.OPERATOR_KEY = 'mock-operator-key';

    // Reset mocks
    jest.clearAllMocks();

    // Setup HCSService mock
    mockSubmitMessage = jest.fn().mockResolvedValue('mock-transaction-id');
    (HCSService as jest.Mock).mockImplementation(() => ({
      submitMessage: mockSubmitMessage
    }));
  });

  it('should execute rebalancing successfully', async () => {
    // Arrange
    const mockRequestData = {
      requestId: 'test-request-id',
      previousRatios: { hbar: 0.33, sauce: 0.33, clxy: 0.34 },
      newRatios: { hbar: 0.4, sauce: 0.3, clxy: 0.3 },
      confidence: 0.85,
      reasoning: ['Market volatility decreased', 'HBAR liquidity improved']
    };

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify(mockRequestData)
    });

    // Act
    const response = await POST(req);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(responseData.success).toBe(true);
    expect(responseData.transactionId).toBe('mock-transaction-id');
    expect(responseData.newRatios).toEqual(mockRequestData.newRatios);
    
    // Verify HCS service was called correctly
    expect(mockSubmitMessage).toHaveBeenCalledWith(
      'mock-topic-id',
      expect.objectContaining({
        type: 'REBALANCE_EXECUTION',
        requestId: mockRequestData.requestId,
        previousRatios: mockRequestData.previousRatios,
        newRatios: mockRequestData.newRatios
      })
    );

    // Verify HCS service was initialized correctly
    expect(HCSService).toHaveBeenCalledWith({
      operatorId: 'mock-operator-id',
      operatorKey: 'mock-operator-key',
      network: 'testnet'
    });
  });

  it('should validate that ratios sum to 1', async () => {
    // Arrange
    const mockRequestData = {
      requestId: 'test-request-id',
      previousRatios: { hbar: 0.33, sauce: 0.33, clxy: 0.34 },
      newRatios: { hbar: 0.5, sauce: 0.6, clxy: 0.2 }, // Sum > 1
      confidence: 0.85,
      reasoning: ['Market volatility decreased', 'HBAR liquidity improved']
    };

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify(mockRequestData)
    });

    // Act
    const response = await POST(req);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(responseData.error).toBe('Ratios must sum to 1');
  });

  it('should handle missing environment variables', async () => {
    // Arrange
    delete process.env.LYNX_REBALANCING_TOPIC_ID;
    
    const mockRequestData = {
      requestId: 'test-request-id',
      previousRatios: { hbar: 0.33, sauce: 0.33, clxy: 0.34 },
      newRatios: { hbar: 0.4, sauce: 0.3, clxy: 0.3 },
      confidence: 0.85,
      reasoning: ['Market volatility decreased', 'HBAR liquidity improved']
    };

    const req = new NextRequest('http://localhost', {
      method: 'POST',
      body: JSON.stringify(mockRequestData)
    });

    // Act
    const response = await POST(req);
    const responseData = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(responseData.error).toBe('Required environment variables not configured');
  });
}); 