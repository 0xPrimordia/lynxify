import { Client, AccountId, TokenId, AccountInfoQuery, TransferTransaction, TokenAssociateTransaction } from "@hashgraph/sdk";
import { rewardNewWallet } from "../tokenRewards";

// Mock the SDK classes
jest.mock("@hashgraph/sdk", () => ({
    AccountId: {
        fromString: jest.fn(str => ({ toString: () => str }))
    },
    TokenId: {
        fromString: jest.fn(str => ({ toString: () => str }))
    },
    AccountInfoQuery: jest.fn(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
            tokenRelationships: new Map()
        })
    })),
    TransferTransaction: jest.fn(() => ({
        addTokenTransfer: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
            getReceipt: jest.fn().mockResolvedValue({
                status: { toString: () => "SUCCESS" }
            })
        })
    })),
    TokenAssociateTransaction: jest.fn(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        setTokenIds: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
            getReceipt: jest.fn().mockResolvedValue({
                status: { toString: () => "SUCCESS" }
            })
        })
    }))
}));

describe('rewardNewWallet', () => {
    const mockClient = {} as Client;
    const mockRecipientId = "0.0.123456";
    const mockOperatorId = "0.0.789012";
    const mockOperatorKey = "mock-key";

    beforeEach(() => {
        // Reset fetch mock before each test
        global.fetch = jest.fn();
    });

    it('should successfully reward a new wallet', async () => {
        // Mock the SaucerSwap API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                priceUsd: 0.1,  // $0.10 per SAUCE
                decimals: 6
            })
        });

        const result = await rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        );

        expect(result).toEqual({
            success: true,
            amount: 50000000, // $5 worth of SAUCE at $0.10 per token with 6 decimals
            tokenId: "0.0.1183558"
        });
    });

    it('should handle token association if needed', async () => {
        // Mock the SaucerSwap API response
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                priceUsd: 0.1,
                decimals: 6
            })
        });

        const result = await rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        );

        expect(TokenAssociateTransaction).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    it('should throw error if price fetch fails', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false
        });

        await expect(rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        )).rejects.toThrow('Failed to fetch SAUCE token data');
    });

    it('should handle token association failure', async () => {
        // Mock token association failure
        // @ts-ignore
        (TokenAssociateTransaction as jest.Mock).mockImplementationOnce(() => ({
            setAccountId: jest.fn().mockReturnThis(),
            setTokenIds: jest.fn().mockReturnThis(),
            execute: jest.fn().mockRejectedValue(new Error('Association failed'))
        }));

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                priceUsd: 0.1,
                decimals: 6
            })
        });

        await expect(rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        )).rejects.toThrow('Association failed');
    });

    it('should handle transfer transaction failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                priceUsd: 0.1,
                decimals: 6
            })
        });

        // Mock transfer failure
        // @ts-ignore
        (TransferTransaction as jest.Mock).mockImplementationOnce(() => ({
            addTokenTransfer: jest.fn().mockReturnThis(),
            execute: jest.fn().mockRejectedValue(new Error('Transfer failed'))
        }));

        await expect(rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        )).rejects.toThrow('Transfer failed');
    });

    it('should handle invalid price data', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                priceUsd: 0, // Invalid price
                decimals: 6
            })
        });

        await expect(rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        )).rejects.toThrow('Invalid token price');
    });

    it('should calculate correct token amount for different prices', async () => {
        const testCases = [
            { price: 0.1, expected: 50000000 },  // $5 / $0.1 = 50 SAUCE
            { price: 1.0, expected: 5000000 },   // $5 / $1.0 = 5 SAUCE
            { price: 0.01, expected: 500000000 } // $5 / $0.01 = 500 SAUCE
        ];

        for (const { price, expected } of testCases) {
            (global.fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    priceUsd: price,
                    decimals: 6
                })
            });

            const result = await rewardNewWallet(
                mockClient,
                mockRecipientId,
                mockOperatorId,
                mockOperatorKey
            );

            expect(result.amount).toBe(expected);
        }
    });
}); 