import { 
    MockTransferTransaction,
    MockAccountId,
    MockHbar,
    MockTransactionId,
    mockTransactionToBase64String,
    mockBase64StringToTransaction
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
            generate: jest.fn().mockImplementation((accountId) => ({
                toString: () => `${accountId.toString()}@${Date.now()}`
            }))
        },
        Client: {
            forTestnet: jest.fn().mockReturnValue({})
        }
    };
});

jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    transactionToBase64String: jest.fn().mockImplementation(mockTransactionToBase64String),
    base64StringToTransaction: jest.fn().mockImplementation(mockBase64StringToTransaction)
}));

const client = {};

describe('Transfer Transaction Flow', () => {
    const testSenderAccount = '0.0.5615014';
    const testRecipientAccount = '0.0.8353144';

    it('should correctly maintain recipient account through encode/decode cycle', () => {
        const senderAccountId = MockAccountId.fromString(testSenderAccount);
        const recipientAccountId = MockAccountId.fromString(testRecipientAccount);
        const amount = MockHbar.from(0.00001);

        const transaction = new MockTransferTransaction()
            .addHbarTransfer(senderAccountId, amount.negated())
            .addHbarTransfer(recipientAccountId, amount)
            .setTransactionId(MockTransactionId.generate(senderAccountId))
            .setMaxTransactionFee(MockHbar.from(2))
            .freezeWith(client);

        // Log original transaction details
        console.log('Original transaction:', {
            hbarTransfers: transaction.hbarTransfers,
            transactionId: transaction.transactionId?.toString()
        });

        // Encode to base64
        const encodedTx = mockTransactionToBase64String(transaction);

        // Decode and verify
        const decodedTx = mockBase64StringToTransaction(encodedTx) as MockTransferTransaction;
        console.log('Decoded transaction:', {
            hbarTransfers: decodedTx.hbarTransfers,
            transactionId: decodedTx.transactionId?.toString()
        });

        // Verify the recipient account is preserved
        const decodedAmount = decodedTx.hbarTransfers.get(recipientAccountId.toString());
        expect(decodedAmount?.toString()).toBe(amount.toString());
    });

    it('should successfully execute a transfer', async () => {
        const senderAccountId = MockAccountId.fromString(testSenderAccount);
        const recipientAccountId = MockAccountId.fromString(testRecipientAccount);
        const amount = MockHbar.from(0.00001);

        const transaction = new MockTransferTransaction()
            .addHbarTransfer(senderAccountId, amount.negated())
            .addHbarTransfer(recipientAccountId, amount)
            .setTransactionId(MockTransactionId.generate(senderAccountId))
            .setMaxTransactionFee(MockHbar.from(2))
            .freezeWith(client);

        // Sign and execute
        const signedTx = await transaction.sign();
        const response = await signedTx.execute();
        const receipt = await response.getReceipt();

        expect(receipt.status.toString()).toBe('SUCCESS');
    });
}); 