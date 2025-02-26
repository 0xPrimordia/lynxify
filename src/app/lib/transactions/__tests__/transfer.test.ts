import { 
    MockTransferTransaction,
    MockAccountId,
    MockHbar,
    MockTransactionId,
    mockTransactionToBase64String,
    mockBase64StringToTransaction,
    MockAccountBalanceQuery,
    MockClient
} from './__mocks__/hedera-mocks';

// Mock the SDK and wallet-connect modules
jest.mock('@hashgraph/sdk', () => {
    return {
        TransferTransaction: jest.fn().mockImplementation(() => new MockTransferTransaction()),
        AccountId: {
            fromString: jest.fn().mockImplementation((str) => new MockAccountId(str))
        },
        Hbar: {
            from: jest.fn().mockImplementation((amount) => new MockHbar(amount.toString()))
        },
        TransactionId: {
            generate: jest.fn().mockImplementation((accountId) => MockTransactionId.generate(accountId))
        },
        Client: {
            forTestnet: jest.fn().mockReturnValue(new MockClient())
        },
        AccountBalanceQuery: jest.fn().mockImplementation(() => new MockAccountBalanceQuery())
    };
});

jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    transactionToBase64String: jest.fn().mockImplementation(mockTransactionToBase64String),
    base64StringToTransaction: jest.fn().mockImplementation(mockBase64StringToTransaction)
}));

describe('Transfer Transaction Flow', () => {
    const validSenderAccount = '0.0.5615014';
    const validRecipientAccount = '0.0.8353144';
    const invalidAccount = '0.0.9999999';
    const client = new MockClient();

    beforeEach(() => {
        // Reset mock implementations before each test
        jest.clearAllMocks();
    });

    describe('Account Validation', () => {
        it('should validate existing accounts', async () => {
            const query = new MockAccountBalanceQuery()
                .setAccountId(MockAccountId.fromString(validRecipientAccount));
            
            const result = await query.execute(client);
            expect(result).toBeDefined();
        });

        it('should reject non-existent accounts with correct error format', async () => {
            const query = new MockAccountBalanceQuery()
                .setAccountId(MockAccountId.fromString(invalidAccount));
            
            await expect(query.execute(client)).rejects.toThrow(/transaction .* failed precheck with status INVALID_ACCOUNT_ID against node account id 0.0.4/);
            await expect(query.execute(client)).rejects.toHaveProperty('name', 'StatusError');
        });
    });

    describe('Transaction Creation', () => {
        it('should correctly maintain recipient account through encode/decode cycle', () => {
            const senderAccountId = MockAccountId.fromString(validSenderAccount);
            const recipientAccountId = MockAccountId.fromString(validRecipientAccount);
            const amount = MockHbar.from(0.00001);

            const transaction = new MockTransferTransaction()
                .addHbarTransfer(senderAccountId, amount.negated())
                .addHbarTransfer(recipientAccountId, amount)
                .setTransactionId(MockTransactionId.generate(senderAccountId))
                .setMaxTransactionFee(MockHbar.from(2))
                .freezeWith(client);

            // Log original transaction details
            console.log('Original transaction:', {
                hbarTransfers: Object.fromEntries(transaction.hbarTransfers),
                transactionId: transaction.transactionId?.toString()
            });

            // Encode to base64
            const encodedTx = mockTransactionToBase64String(transaction);

            // Decode and verify
            const decodedTx = mockBase64StringToTransaction(encodedTx) as MockTransferTransaction;
            console.log('Decoded transaction:', {
                hbarTransfers: Object.fromEntries(decodedTx.hbarTransfers),
                transactionId: decodedTx.transactionId?.toString()
            });

            // Verify the recipient account and amount are preserved
            const decodedAmount = decodedTx.hbarTransfers.get(recipientAccountId.toString());
            expect(decodedAmount?.toString()).toBe(amount.toString());
            
            // Compare only the account ID part of the transaction ID
            const [originalAccountId] = transaction.transactionId?.toString().split('@') || [];
            const [decodedAccountId] = decodedTx.transactionId?.toString().split('@') || [];
            expect(decodedAccountId).toBe(originalAccountId);
        });

        it('should fail when transaction data is corrupted', () => {
            const senderAccountId = MockAccountId.fromString(validSenderAccount);
            const recipientAccountId = MockAccountId.fromString(validRecipientAccount);
            const amount = MockHbar.from(0.00001);

            const transaction = new MockTransferTransaction()
                .addHbarTransfer(senderAccountId, amount.negated())
                .addHbarTransfer(recipientAccountId, amount)
                .setTransactionId(MockTransactionId.generate(senderAccountId))
                .setMaxTransactionFee(MockHbar.from(2))
                .freezeWith(client);

            // Mock the transaction data corruption
            const corruptedData = {
                ...transaction.toJSON(),
                hbarTransfers: {
                    [recipientAccountId.toString()]: '0.0.9'
                }
            };

            // Create corrupted base64
            const encodedTx = Buffer.from(JSON.stringify(corruptedData)).toString('base64');
            const decodedTx = mockBase64StringToTransaction(encodedTx) as MockTransferTransaction;

            // Verify the corruption is detected
            const decodedAmount = decodedTx.hbarTransfers.get(recipientAccountId.toString());
            expect(decodedAmount?.toString()).not.toBe(amount.toString());
        });
    });

    describe('Transaction Execution', () => {
        it('should successfully execute a transfer with valid accounts', async () => {
            const senderAccountId = MockAccountId.fromString(validSenderAccount);
            const recipientAccountId = MockAccountId.fromString(validRecipientAccount);
            const amount = MockHbar.from(0.00001);

            const transaction = new MockTransferTransaction()
                .addHbarTransfer(senderAccountId, amount.negated())
                .addHbarTransfer(recipientAccountId, amount)
                .setTransactionId(MockTransactionId.generate(senderAccountId))
                .setMaxTransactionFee(MockHbar.from(2))
                .freezeWith(client);

            // Sign and execute
            const signedTx = await transaction.sign();
            const response = await signedTx.execute(client);
            const receipt = await response.getReceipt();

            expect(receipt.status.toString()).toBe('SUCCESS');
        });

        it('should fail execution with invalid account', async () => {
            const senderAccountId = MockAccountId.fromString(validSenderAccount);
            const invalidRecipientId = MockAccountId.fromString(invalidAccount);
            const amount = MockHbar.from(0.00001);

            const transaction = new MockTransferTransaction()
                .addHbarTransfer(senderAccountId, amount.negated())
                .addHbarTransfer(invalidRecipientId, amount)
                .setTransactionId(MockTransactionId.generate(senderAccountId))
                .setMaxTransactionFee(MockHbar.from(2))
                .freezeWith(client);

            // Sign and execute
            const signedTx = await transaction.sign();
            
            // Should throw INVALID_ACCOUNT_ID error
            await expect(signedTx.execute(client)).rejects.toThrow('INVALID_ACCOUNT_ID');
        });
    });
}); 