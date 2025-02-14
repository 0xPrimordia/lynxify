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

    it('should successfully reward a new wallet', async () => {
        const result = await rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        );

        expect(result).toEqual({
            success: true,
            amount: 100000000, // 100 SAUCE with 6 decimals
            tokenId: "0.0.1183558"
        });
    });

    it('should handle token association if needed', async () => {
        const result = await rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        );

        expect(TokenAssociateTransaction).toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    it('should handle token association failure', async () => {
        // Mock token association failure
        // @ts-ignore
        (TokenAssociateTransaction as jest.Mock).mockImplementationOnce(() => ({
            setAccountId: jest.fn().mockReturnThis(),
            setTokenIds: jest.fn().mockReturnThis(),
            execute: jest.fn().mockRejectedValue(new Error('Association failed'))
        }));

        await expect(rewardNewWallet(
            mockClient,
            mockRecipientId,
            mockOperatorId,
            mockOperatorKey
        )).rejects.toThrow('Association failed');
    });

    it('should handle transfer transaction failure', async () => {
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
}); 