import { 
    TransferTransaction, 
    AccountId, 
    Hbar, 
    Client, 
    AccountBalanceQuery,
    TransactionId
} from '@hashgraph/sdk';

jest.setTimeout(30000); // Set timeout globally for all tests

describe('Transfer Transaction Integration', () => {
    const client = Client.forTestnet();
    const validSenderAccount = '0.0.4340026';
    const validRecipientAccount = '0.0.5615014';
    const invalidAccount = '0.0.9999999';

    describe('Account Validation', () => {
        it('should validate existing accounts', async () => {
            const query = new AccountBalanceQuery()
                .setAccountId(AccountId.fromString(validRecipientAccount));
            
            const result = await query.execute(client);
            expect(result).toBeDefined();
            expect(result.hbars).toBeDefined();
        });

        it('should reject non-existent accounts with correct error format', async () => {
            const query = new AccountBalanceQuery()
                .setAccountId(AccountId.fromString(invalidAccount));
            
            try {
                await query.execute(client);
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error.name).toBe('StatusError');
                expect(error.message).toMatch(/transaction .* failed precheck with status INVALID_ACCOUNT_ID against node account id/);
                console.log('Full error:', error);
            }
        });
    });

    describe('Transaction Creation', () => {
        it('should create a valid transfer transaction', async () => {
            const senderAccountId = AccountId.fromString(validSenderAccount);
            const recipientAccountId = AccountId.fromString(validRecipientAccount);
            const amount = Hbar.fromTinybars(1);

            const transaction = await new TransferTransaction()
                .addHbarTransfer(senderAccountId, amount.negated())
                .addHbarTransfer(recipientAccountId, amount)
                .setTransactionId(TransactionId.generate(senderAccountId))
                .setMaxTransactionFee(new Hbar(2))
                .freezeWith(client);

            console.log('Transaction details:', {
                hbarTransfers: transaction.hbarTransfers,
                transactionId: transaction.transactionId?.toString(),
                nodeAccountIds: transaction.nodeAccountIds?.map(id => id.toString())
            });

            expect(transaction.hbarTransfers.get(recipientAccountId.toString())?.toTinybars().toString())
                .toBe(amount.toTinybars().toString());
        });

        it('should fail validation with invalid account', async () => {
            const senderAccountId = AccountId.fromString(validSenderAccount);
            const invalidRecipientId = AccountId.fromString(invalidAccount);
            const amount = Hbar.fromTinybars(1);

            const transaction = new TransferTransaction()
                .addHbarTransfer(senderAccountId, amount.negated())
                .addHbarTransfer(invalidRecipientId, amount)
                .setTransactionId(TransactionId.generate(senderAccountId))
                .setMaxTransactionFee(new Hbar(2));

            await expect(transaction.freezeWith(client)).rejects.toHaveProperty('name', 'PrecheckStatusError');
        });
    });
}); 