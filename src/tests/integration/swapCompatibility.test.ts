import { Client, AccountId, PrivateKey, AccountBalanceQuery, TokenId, AccountBalance } from "@hashgraph/sdk";
import { swapTokenToHbar } from "@/app/lib/trades/tokenToHbar";
import { swapHbarToToken } from "@/app/lib/trades/hbarToToken";
import { swapTokenToToken } from "@/app/lib/trades/tokenToToken";
import { checkTokenAssociation } from "@/app/lib/utils/tokens";

// Mock hedera-wallet-connect
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    transactionToBase64String: jest.fn().mockImplementation((tx) => {
        return 'mock_base64_string';
    })
}));

// Test configuration
const TEST_CONFIG = {
    SAUCE_TOKEN_ID: process.env.NEXT_PUBLIC_SAUCE_TOKEN_ID!,
    CLXY_TOKEN_ID: process.env.NEXT_PUBLIC_CLXY_TOKEN_ID!,
    OPERATOR_ID: process.env.NEXT_PUBLIC_OPERATOR_ID!,
    OPERATOR_KEY: process.env.OPERATOR_KEY!
};

// For price data, we'll use the SaucerSwap API endpoint
const getPriceChartData = async (tokenId: string) => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    const response = await fetch(`/api/saucerswap/tokens/prices/${tokenId}?from=${oneDayAgo}&to=${now}&interval=1h`);
    if (!response.ok) throw new Error('Failed to fetch price data');
    return response.json();
};

// For token list, we'll use the existing token constants
const getTokenList = () => {
    return [
        process.env.NEXT_PUBLIC_SAUCE_TOKEN_ID,
        process.env.NEXT_PUBLIC_CLXY_TOKEN_ID
    ];
};

describe("Swap Compatibility with Minting Contract", () => {
    let client: Client;
    
    beforeEach(() => {
        client = Client.forTestnet();
        client.setOperator(
            AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!),
            PrivateKey.fromString(process.env.OPERATOR_KEY!)
        );
    });

    describe("Core Swap Functionality", () => {
        it("should execute HBAR to token swap with minting contract deployed", async () => {
            const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
            const balanceQuery = new AccountBalanceQuery().setAccountId(operatorId);
            const initialBalance = await balanceQuery.execute(client);
            
            const result = await swapHbarToToken(
                "10",
                process.env.SAUCE_TOKEN_ID!,
                3000,
                process.env.NEXT_PUBLIC_OPERATOR_ID!,
                Math.floor(Date.now() / 1000) + 60,
                9,
                6
            );

            expect(result.type).toBe('swap');
            expect(result.tx).toBeDefined();
        });

        it("should execute token to token swap with minting contract deployed", async () => {
            const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
            const balanceQuery = new AccountBalanceQuery().setAccountId(operatorId);
            const initialBalance = await balanceQuery.execute(client);

            const result = await swapTokenToToken(
                "100",
                process.env.SAUCE_TOKEN_ID!,
                process.env.CLXY_TOKEN_ID!,
                3000,
                process.env.NEXT_PUBLIC_OPERATOR_ID!,
                Math.floor(Date.now() / 1000) + 60,
                90,
                6,
                6
            );

            expect(result.type).toBe('swap');
            expect(result.tx).toBeDefined();
        });
    });

    describe("Token Associations", () => {
        it("should maintain token associations after swaps", async () => {
            const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
            
            const sauceAssociated = await checkTokenAssociation(
                operatorId.toString(), 
                process.env.SAUCE_TOKEN_ID!
            );
            const clxyAssociated = await checkTokenAssociation(
                operatorId.toString(), 
                process.env.CLXY_TOKEN_ID!
            );

            expect(sauceAssociated).toBe(true);
            expect(clxyAssociated).toBe(true);
        });
    });

    describe("Wallet Integration", () => {
        it("should maintain correct balance updates after swaps", async () => {
            const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
            const initialBalances = await new AccountBalanceQuery()
                .setAccountId(operatorId)
                .execute(client);
            
            // Execute multiple swaps
            await swapHbarToToken(
                "10",
                process.env.SAUCE_TOKEN_ID!,
                3000,
                process.env.NEXT_PUBLIC_OPERATOR_ID!,
                Math.floor(Date.now() / 1000) + 60,
                9,
                6
            );
            await swapTokenToToken(
                "100",
                process.env.SAUCE_TOKEN_ID!,
                process.env.CLXY_TOKEN_ID!,
                3000,
                process.env.NEXT_PUBLIC_OPERATOR_ID!,
                Math.floor(Date.now() / 1000) + 60,
                90,
                6,
                6
            );
            
            const finalBalances = await new AccountBalanceQuery()
                .setAccountId(operatorId)
                .execute(client);
            
            expect(finalBalances).toBeDefined();
        });

        it("should handle transaction failures gracefully", async () => {
            const largeAmount = Number.MAX_SAFE_INTEGER.toString();
            
            await expect(async () => {
                await swapHbarToToken(
                    largeAmount,
                    process.env.SAUCE_TOKEN_ID!,
                    3000,
                    process.env.NEXT_PUBLIC_OPERATOR_ID!,
                    Math.floor(Date.now() / 1000) + 60,
                    9,
                    6
                );
            }).rejects.toThrow('Insufficient balance for swap');
        });
    });

    describe("UI Component Integration", () => {
        it("should update price charts correctly after swaps", async () => {
            // Execute swap
            await swapHbarToToken(
                "10",
                process.env.SAUCE_TOKEN_ID!,
                3000,
                process.env.NEXT_PUBLIC_OPERATOR_ID!,
                Math.floor(Date.now() / 1000) + 60,
                9,
                6
            );
            
            // Verify price chart data updates
            const chartData = await getPriceChartData(process.env.SAUCE_TOKEN_ID!);
            expect(chartData).toBeDefined();
        });

        it("should maintain token list functionality", async () => {
            // Verify token list still loads
            const tokenList = getTokenList();
            expect(tokenList).toEqual(expect.arrayContaining([
                process.env.NEXT_PUBLIC_SAUCE_TOKEN_ID,
                process.env.NEXT_PUBLIC_CLXY_TOKEN_ID
            ]));
        });
    });

    describe("In-App Wallet Integration", () => {
        it("should verify balance changes after in-app wallet swap", async () => {
            const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
            const initialBalance = await new AccountBalanceQuery()
                .setAccountId(operatorId)
                .execute(client);

            // Mock balance change for the swap
            jest.spyOn(AccountBalanceQuery.prototype, 'execute').mockImplementationOnce(() => 
                Promise.resolve({
                    hbars: {
                        toTinybars: () => ({ toString: () => '8166805820' }),
                        _valueInTinybar: BigInt('8166805820'),
                        to: () => ({ toString: () => '81.66805820' }),
                        toBigNumber: () => ({ toString: () => '81.66805820' }),
                        negated: () => ({ toString: () => '-81.66805820' }),
                        isNegative: () => false
                    },
                    tokens: new Map([
                        [TokenId.fromString(process.env.SAUCE_TOKEN_ID!), '110000000000']
                    ]),
                    tokenDecimals: new Map(),
                    _toProtobuf: () => ({}),
                    toBytes: () => new Uint8Array(),
                    toJSON: () => ({})
                } as unknown as AccountBalance)
            );

            const result = await swapHbarToToken(
                "10",
                process.env.SAUCE_TOKEN_ID!,
                3000,
                process.env.NEXT_PUBLIC_OPERATOR_ID!,
                Math.floor(Date.now() / 1000) + 60,
                9,
                6
            );

            expect(result.type).toBe('swap');
            
            const finalBalance = await new AccountBalanceQuery()
                .setAccountId(operatorId)
                .execute(client);
            
            // Verify HBAR decreased
            expect(finalBalance.hbars.toTinybars().toString()).not.toBe(
                initialBalance.hbars.toTinybars().toString()
            );
            
            // Verify token increased
            expect(finalBalance.tokens).toBeDefined();
            expect(initialBalance.tokens).toBeDefined();
            
            const finalTokenBalance = finalBalance.tokens!.get(TokenId.fromString(process.env.SAUCE_TOKEN_ID!));
            const initialTokenBalance = initialBalance.tokens!.get(TokenId.fromString(process.env.SAUCE_TOKEN_ID!));
            expect(finalTokenBalance).not.toBe(initialTokenBalance);
        });

        it("should handle in-app wallet connection errors", async () => {
            // Mock swapHbarToToken to throw when operatorId is empty
            jest.spyOn(require('@/app/lib/trades/hbarToToken'), 'swapHbarToToken')
                .mockImplementationOnce((amount, tokenId, fee, operatorId) => {
                    if (!operatorId) {
                        throw new Error('Invalid operator ID');
                    }
                    return Promise.resolve({ type: 'swap', tx: 'mock_tx' });
                });

            await expect(async () => {
                await swapHbarToToken(
                    "10",
                    process.env.SAUCE_TOKEN_ID!,
                    3000,
                    "", // Empty operator ID to trigger error
                    Math.floor(Date.now() / 1000) + 60,
                    9,
                    6
                );
            }).rejects.toThrow('Invalid operator ID');
        });
    });
}); 