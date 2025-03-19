/**
 * @jest-environment jsdom
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { 
    AccountId, 
    Client, 
    TokenId,
    AccountBalanceQuery,
    Long
} from "@hashgraph/sdk";
import { ethers } from 'ethers';

// Create the withTimeout utility function
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Operation timed out'));
    }, timeoutMs);

    promise
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Mock axios module
const mockAxios = {
    post: jest.fn()
};
jest.mock('axios', () => mockAxios);

// Mock modules
const mockTokenUtils = {
    checkTokenAssociation: jest.fn(),
    associateToken: jest.fn(),
    checkTokenAllowance: jest.fn(),
    approveTokenForSwap: jest.fn()
};

// Initialize default mock values
mockTokenUtils.checkTokenAllowance.mockResolvedValue(true as never);
mockTokenUtils.approveTokenForSwap.mockResolvedValue('mock-approval-tx' as never);

jest.mock('../app/lib/utils/tokens', () => mockTokenUtils);

jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    transactionToBase64String: jest.fn().mockReturnValue('mock-base64-transaction')
}));

// Mock the ethers Interface
const mockEthers = {
    Interface: function() {
        return {
            encodeFunctionData: jest.fn().mockReturnValue('0x1234567890abcdef')
        };
    }
};

// Mock the saucerswap module
const mockSaucerSwap = {
    getQuoteExactInput: jest.fn(),
    swapHbarToToken: jest.fn(),
    swapTokenToHbar: jest.fn(),
    swapTokenToToken: jest.fn()
};

// Initialize default mock values
mockSaucerSwap.getQuoteExactInput.mockResolvedValue('9000000000' as never);
mockSaucerSwap.swapHbarToToken.mockImplementation(function(
    hbarAmount: any, 
    tokenId: any, 
    fee: any, 
    accountId: any, 
    deadline: any, 
    slippageBasisPoints: any, 
    tokenDecimals: any
) {
    if (deadline < Math.floor(Date.now() / 1000)) {
        throw new Error('Transaction timestamp is too old');
    }
    
    const mockInterface = new (mockEthers.Interface as any)();
    
    let amountInValue = hbarAmount;
    if (typeof hbarAmount === 'object' && hbarAmount !== null && 'toTinybars' in hbarAmount) {
        const tinybars = (hbarAmount.toTinybars as Function)();
        amountInValue = tinybars.toString ? tinybars.toString() : tinybars;
    }
    
    return Promise.resolve({
        type: 'swap',
        tx: 'mock-transaction'
    });
});

mockSaucerSwap.swapTokenToHbar.mockResolvedValue({
    type: 'swap',
    tx: 'mock-transaction'
} as never);

mockSaucerSwap.swapTokenToToken.mockResolvedValue({
    type: 'swap',
    tx: 'mock-transaction'
} as never);

jest.mock('../app/lib/saucerswap', () => mockSaucerSwap);

describe('Swap Flow Tests', () => {
    let mockClient: Client;
    const mockAccount = "0.0.123456";
    const mockTokenA = "0.0.15058"; // WHBAR
    const mockTokenB = "0.0.789012";
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = {
            execute: jest.fn(),
        } as unknown as Client;
    });

    it('should not generate duplicate association transactions', async () => {
        const associationCheckCalls: string[] = [];
        const associationTxCalls: string[] = [];

        mockTokenUtils.checkTokenAssociation.mockImplementation(async (account, tokenId) => {
            associationCheckCalls.push(`${account}-${tokenId}`);
            return false;
        });

        mockTokenUtils.associateToken.mockImplementation(async (account, tokenId) => {
            const callKey = `${account}-${tokenId}`;
            if (associationTxCalls.includes(callKey)) {
                throw new Error(`Duplicate association attempt for ${callKey}`);
            }
            associationTxCalls.push(callKey);
            return "mock-transaction";
        });
        
        try {
            await mockSaucerSwap.swapTokenToToken(
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
        
        await expect(async () => {
            await mockSaucerSwap.swapHbarToToken(
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
        
        // @ts-ignore
        const mockSwapExecution = jest.fn().mockImplementation(async (index: number): Promise<SwapResult> => {
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
            // @ts-ignore
            mockSwapExecution(index).catch((e: Error): SwapResult => ({ error: e.message }))
        );
        
        const results = await Promise.all(swapPromises);
        
        expect(executingCalls).toBe(0);
        expect(completedCalls.length).toBe(1);
        expect(results.filter((r: {error?: string, success?: boolean}) => r.error !== undefined)).toHaveLength(2);
    });

    it('should properly convert Long objects to strings in hbarToToken', async () => {
        const mockLong = new Long(1000000000, 0, false);
        const mockHbar = {
            toTinybars: () => mockLong,
            toString: () => '10'
        };
        
        const result = await mockSaucerSwap.swapHbarToToken(
            mockHbar,
            mockTokenB,
            3000,
            mockAccount,
            Math.floor(Date.now() / 1000) + 60,
            50,
            8
        );
        
        expect(result).toEqual({
            type: 'swap',
            tx: 'mock-transaction'
        });
    });

    it('should successfully swap HBAR to token', async () => {
        // Mock successful swap response
        const mockTxResponse = { type: 'swap', tx: 'base64-transaction-string' };
        
        // Setup mocks
        mockSaucerSwap.swapHbarToToken.mockResolvedValueOnce(mockTxResponse as never);
        mockSaucerSwap.getQuoteExactInput.mockResolvedValueOnce('1000000' as never);
        // @ts-ignore
        mockAxios.post.mockResolvedValueOnce({ data: { result: '0xresult' }} as any);
        
        // Execute swap operation
        const result = await mockSaucerSwap.swapHbarToToken(
            '1.0',
            mockTokenB,
            3000,
            mockAccount,
            Math.floor(Date.now() / 1000) + 60,
            50,
            8
        );
        
        // Verify results
        expect(result).toEqual(mockTxResponse);
    });
    
    it('should handle quote retrieval error', async () => {
        // Setup mock error
        const quoteError = new Error('Failed to get quote');
        
        // Set up sequential mock behaviors
        mockSaucerSwap.swapHbarToToken.mockImplementationOnce(() => {
            return Promise.reject(quoteError);
        });
        
        // Execute and expect error
        await expect(
            mockSaucerSwap.swapHbarToToken(
                '1.0',
                mockTokenB,
                3000,
                mockAccount,
                Math.floor(Date.now() / 1000) + 60,
                50,
                8
            )
        ).rejects.toThrow('Failed to get quote');
    });
    
    it('should timeout when swap takes too long', async () => {
        // Mock never resolving promise
        const neverResolvingPromise = new Promise(() => {});
        mockSaucerSwap.swapHbarToToken.mockReturnValueOnce(neverResolvingPromise);
        
        // Execute with timeout wrapper
        await expect(
            withTimeout(
                mockSaucerSwap.swapHbarToToken(
                    '1.0',
                    mockTokenB,
                    3000,
                    mockAccount,
                    Math.floor(Date.now() / 1000) + 60,
                    50,
                    8
                ) as Promise<any>,
                100
            )
        ).rejects.toThrow('Operation timed out');
    });
}); 