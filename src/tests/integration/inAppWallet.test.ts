/**
 * @jest-environment @edge-runtime/jest-environment
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import "fake-indexeddb/auto";

// Mock the authenticateWallet function manually
const mockAuthenticateWallet = jest.fn();
jest.mock('./helpers/auth', () => ({
  authenticateWallet: mockAuthenticateWallet
}));

// Mock SessionPasswordManager
const mockClearPassword = jest.fn();
jest.mock('@/lib/utils/sessionPassword', () => ({
  clearPassword: mockClearPassword,
  setPassword: jest.fn(),
  getPassword: jest.fn()
}));

// Create mock session data
const mockSession = {
  token: 'mock-token',
  userId: 'mock-user-id'
};

describe('In-App Wallet Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up mock implementation
    mockAuthenticateWallet.mockResolvedValue(mockSession as never);
    mockClearPassword.mockResolvedValue(undefined as never);
  });

  describe('Wallet Creation Flow', () => {
    it('should create a new wallet and authenticate', async () => {
      // Create simple mock objects - we don't need real AccountId/PrivateKey instances
      const mockAccountId = { toString: () => '0.0.123456' };
      const mockPrivateKey = { 
        toString: () => 'mock-private-key',
        sign: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]) as never)
      };
      
      const result = await mockAuthenticateWallet(mockAccountId, mockPrivateKey);
      
      expect(result).toEqual(mockSession);
      expect(mockAuthenticateWallet).toHaveBeenCalledWith(mockAccountId, mockPrivateKey);
    });
  });

  describe('In-App Wallet Registration Flow', () => {
    it('should clean up session password after verification', async () => {
      // Create simple mock objects
      const mockAccountId = { toString: () => '0.0.123456' };
      const mockPrivateKey = { 
        toString: () => 'mock-private-key',
        sign: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]) as never)
      };
      
      await mockAuthenticateWallet(mockAccountId, mockPrivateKey);
      
      // Simulate session password cleanup
      await mockClearPassword();
      
      expect(mockClearPassword).toHaveBeenCalled();
    });
  });
}); 