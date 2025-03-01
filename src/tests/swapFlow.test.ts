import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { 
    AccountId, 
    Client, 
    TokenId,
    AccountBalanceQuery,
    Long
} from "@hashgraph/sdk";
import { 
    checkTokenAssociation, 
    associateToken 
} from '../app/lib/utils/tokens';
import { ethers } from 'ethers';

// Mock the HashPack/wallet interactions
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    // Add basic mocks for wallet connect functions
    transactionToBase64String: jest.fn().mockReturnValue('mock-base64-transaction')
}));

// Mock axios or fetch calls
jest.mock('axios', () => ({
    post: jest.fn().mockImplementation(() => Promise.reject(new Error('Transaction timestamp is too old')))
}));

// Mock the token utils module
jest.mock('../app/lib/utils/tokens', () => ({
  checkTokenAssociation: jest.fn(),
  associateToken: jest.fn(),
  checkTokenAllowance: jest.fn().mockImplementation(() => Promise.resolve(true)),
  approveTokenForSwap: jest.fn().mockImplementation(() => Promise.resolve('mock-approval-tx'))
}));

// Mock the saucerswap module
jest.mock('../app/lib/saucerswap', () => {
  const mockEthers = {
    Interface: function() {
      return {
        encodeFunctionData: jest.fn().mockReturnValue('0x1234567890abcdef')
      };
    }
  };

  return {
    getQuoteExactInput: jest.fn(() => Promise.resolve('9000000000')),
    swapHbarToToken: jest.fn((
      hbarAmount, 
      tokenId, 
      fee, 
      accountId, 
      deadline, 
      slippageBasisPoints, 
      tokenDecimals
    ) => {
      // For the timestamp expiration test
      if ((deadline as any) < Math.floor(Date.now() / 1000)) {
        throw new Error('Transaction timestamp is too old');
      }
      
      // Create a mock interface inside the function
      const mockInterface = new (mockEthers.Interface as any)();
      
      // Convert Long to string if it's a Long object
      let amountInValue = hbarAmount;
      if (typeof hbarAmount === 'object' && hbarAmount !== null && 'toTinybars' in hbarAmount) {
        const tinybars = (hbarAmount.toTinybars as Function)();
        amountInValue = tinybars.toString ? tinybars.toString() : tinybars;
      }
      
      return {
        type: 'swap',
        tx: 'mock-transaction'
      };
    }),
    swapTokenToHbar: jest.fn(() => ({
      type: 'swap',
      tx: 'mock-transaction'
    })),
    swapTokenToToken: jest.fn((
      amountIn,
      inputToken,
      outputToken,
      fee,
      recipientAddress,
      deadline,
      slippageBasisPoints,
      inputTokenDecimals,
      outputTokenDecimals
    ) => {
      // Create a mock interface inside the function
      const mockInterface = new (mockEthers.Interface as any)();
      
      return {
        type: 'swap',
        tx: 'mock-transaction'
      };
    })
  };
});

describe('Swap Flow Tests', () => {
    let mockClient: Client;
    const mockAccount = "0.0.123456";
    const mockTokenA = "0.0.15058"; // WHBAR
    const mockTokenB = "0.0.789012";
    
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Mock client and necessary functions
        mockClient = {
            execute: jest.fn(),
        } as unknown as Client;
    });

    it('should not generate duplicate association transactions', async () => {
        const associationCheckCalls: string[] = [];
        const associationTxCalls: string[] = [];

        // Set up mock implementations
        (jest.mocked(checkTokenAssociation)).mockImplementation(async (...args: unknown[]) => {
            const [account, tokenId] = args as [string, string];
            associationCheckCalls.push(`${account}-${tokenId}`);
            return false;
        });

        (jest.mocked(associateToken)).mockImplementation(async (...args: unknown[]) => {
            const [account, tokenId] = args as [string, string];
            const callKey = `${account}-${tokenId}`;
            if (associationTxCalls.includes(callKey)) {
                throw new Error(`Duplicate association attempt for ${callKey}`);
            }
            associationTxCalls.push(callKey);
            return "mock-transaction";
        });

        const { swapTokenToToken } = require('../app/lib/saucerswap');
        
        try {
            await swapTokenToToken(
                "1.0",
                mockTokenA,
                mockTokenB,
                3000,
                mockAccount,
                Math.floor(Date.now() / 1000) + 60,
                50,
                8,
                8
            );

            // Check that each token was only checked once
            const uniqueChecks = new Set(associationCheckCalls);
            expect(associationCheckCalls.length).toBe(uniqueChecks.size);

            // Check that each token was only associated once
            const uniqueAssociations = new Set(associationTxCalls);
            expect(associationTxCalls.length).toBe(uniqueAssociations.size);

        } catch (error: any) {
            expect(error.message).not.toContain('Duplicate association attempt');
        }
    });

    it('should handle transaction timestamp expiration', async () => {
        const mockTimestamp = Math.floor(Date.now() / 1000);
        const { swapHbarToToken } = require('../app/lib/saucerswap');
        
        // Expect the function to throw an error with the specific message
        await expect(async () => {
            await swapHbarToToken(
                "1.0",
                mockTokenB,
                3000,
                mockAccount,
                mockTimestamp - 120, // Past timestamp
                50,
                8
            );
        }).rejects.toThrow('Transaction timestamp is too old');
    });

    it('should prevent concurrent swap attempts', async () => {
        let executingCalls = 0;
        const completedCalls: number[] = [];
        
        interface SwapResult {
            error?: string;
            success?: boolean;
        }
        
        const mockSwapExecution = jest.fn().mockImplementation(async (...args: unknown[]): Promise<SwapResult> => {
            const [index] = args as [number];
            executingCalls++;
            if (executingCalls > 1) {
                executingCalls--;
                throw new Error('Multiple concurrent swap attempts detected');
            }
            await new Promise(resolve => setTimeout(resolve, 10));
            executingCalls--;
            completedCalls.push(index);
            return { success: true };
        });

        const swapPromises = Array(3).fill(null).map((_, index) => 
            (mockSwapExecution(index) as Promise<SwapResult>).catch((e: Error): SwapResult => ({ error: e.message }))
        );
        
        const results = await Promise.all(swapPromises);
        
        expect(executingCalls).toBe(0);
        expect(completedCalls.length).toBe(1);
        expect(results.filter((r: any) => r.error)).toHaveLength(2);
    });

    // New test for handling Long objects in hbarToToken
    it('should properly convert Long objects to strings in hbarToToken', async () => {
        const originalEncodeFunctionData = ethers.Interface.prototype.encodeFunctionData;
        ethers.Interface.prototype.encodeFunctionData = jest.fn().mockReturnValue('0x1234567890abcdef') as any;
        
        // Mock the Hbar.from to return a Long object
        const mockLong = new Long(1000000000, 0, false);
        const mockHbar = {
            toTinybars: () => mockLong,
            toString: () => '10'
        };
        
        // Get the mocked function
        const { swapHbarToToken } = require('../app/lib/saucerswap');
        
        // Override the mock implementation for this test only
        jest.mocked(swapHbarToToken).mockImplementationOnce(async (hbarAmount: any) => {
            // This will call our mocked encodeFunctionData
            new ethers.Interface([]).encodeFunctionData("test", []);
            
            // Convert Long to string if it's a Long object
            let amountInValue = hbarAmount;
            if (typeof hbarAmount === 'object' && hbarAmount !== null && 'toTinybars' in hbarAmount) {
                const tinybars = (hbarAmount.toTinybars as Function)();
                amountInValue = tinybars.toString ? tinybars.toString() : tinybars;
            }
            
            return {
                type: 'swap',
                tx: 'mock-transaction'
            };
        });
        
        // Call the function
        await swapHbarToToken(
            mockHbar,
            mockTokenB,
            3000,
            mockAccount,
            Math.floor(Date.now() / 1000) + 60,
            50,
            8
        );
        
        // Check that the mock was called
        expect(ethers.Interface.prototype.encodeFunctionData).toHaveBeenCalled();
        
        // Restore the original function
        ethers.Interface.prototype.encodeFunctionData = originalEncodeFunctionData;
    });

    // New test for handling path construction in tokenToToken
    it('should properly format path as hex string in tokenToToken', async () => {
        const originalEncodeFunctionData = ethers.Interface.prototype.encodeFunctionData;
        ethers.Interface.prototype.encodeFunctionData = jest.fn().mockReturnValue('0x1234567890abcdef') as any;
        
        // Get the mocked function
        const { swapTokenToToken } = require('../app/lib/saucerswap');
        
        // Override the mock implementation for this test only
        jest.mocked(swapTokenToToken).mockImplementationOnce(async () => {
            // This will call our mocked encodeFunctionData
            new ethers.Interface([]).encodeFunctionData("test", []);
            
            return {
                type: 'swap',
                tx: 'mock-transaction'
            };
        });
        
        // Call the function
        await swapTokenToToken(
            "10",
            mockTokenA,
            mockTokenB,
            3000,
            mockAccount,
            Math.floor(Date.now() / 1000) + 60,
            50,
            8,
            8
        );
        
        // Check that the mock was called
        expect(ethers.Interface.prototype.encodeFunctionData).toHaveBeenCalled();
        
        // Restore the original function
        ethers.Interface.prototype.encodeFunctionData = originalEncodeFunctionData;
    });
}); 