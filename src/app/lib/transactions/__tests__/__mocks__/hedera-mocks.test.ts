import {
    MockAccountBalanceQuery,
    MockClient,
    MockTransactionId,
    MockTransferTransaction,
    MockAccountId,
    MockHbar,
    mockTransactionToBase64String,
    mockBase64StringToTransaction
} from './hedera-mocks';

describe('Hedera Mocks', () => {
    describe('MockAccountBalanceQuery', () => {
        it('should return balance for valid account', async () => {
            const query = new MockAccountBalanceQuery();
            const accountId = new MockAccountId('0.0.5615014');
            const client = new MockClient();

            const result = await query.setAccountId(accountId).execute(client);
            expect(result.hbars.toTinybars()).toBe('1000000000');
        });

        it('should throw error for invalid account', async () => {
            const query = new MockAccountBalanceQuery();
            const accountId = new MockAccountId('0.0.999999');
            const client = new MockClient();

            await expect(query.setAccountId(accountId).execute(client)).rejects.toThrow();
        });
    });

    describe('MockTransferTransaction', () => {
        it('should handle HBAR transfers', () => {
            const tx = new MockTransferTransaction();
            const sender = new MockAccountId('0.0.5615014');
            const receiver = new MockAccountId('0.0.8353144');
            const amount = MockHbar.from(10);

            tx.addHbarTransfer(sender, amount.negated())
              .addHbarTransfer(receiver, amount);

            const transfers = tx.hbarTransfers;
            expect(transfers.get(sender.toString())).toBeDefined();
            expect(transfers.get(receiver.toString())).toBeDefined();
        });

        it('should convert to and from base64 string', () => {
            const tx = new MockTransferTransaction();
            const sender = new MockAccountId('0.0.5615014');
            const receiver = new MockAccountId('0.0.8353144');
            const amount = MockHbar.from(10);

            tx.addHbarTransfer(sender, amount.negated())
              .addHbarTransfer(receiver, amount);

            const base64 = mockTransactionToBase64String(tx);
            const decodedTx = mockBase64StringToTransaction(base64);

            expect(decodedTx.hbarTransfers.size).toBe(tx.hbarTransfers.size);
            expect(decodedTx.transactionId).toEqual(tx.transactionId);
        });
    });
}); 