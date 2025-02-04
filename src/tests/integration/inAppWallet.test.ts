import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import { setupTestClient, validateTestEnvironment } from './helpers/setup';
import { authenticateWallet } from './helpers/auth';
import { AccountBalanceQuery } from "@hashgraph/sdk";
import { fetch } from 'cross-fetch';

describe('In-App Wallet Integration', () => {
    let client: Client;
    let operatorId: AccountId;
    let operatorKey: PrivateKey;

    beforeAll(async () => {
        console.log('\nValidating test environment...');
        validateTestEnvironment();

        console.log('\nSetting up test client...');
        const setup = setupTestClient();
        client = setup.client;
        operatorId = setup.operatorId;
        operatorKey = setup.operatorKey;
    });

    describe.skip('Wallet Creation Flow', () => {
        it('should create a new wallet and authenticate', async () => {
            console.log('\nTesting wallet creation flow...');
            
            // 1. Create wallet through API
            console.log('Creating wallet via API...');
            const response = await fetch('http://localhost:3000/api/wallet/create-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    publicKey: PrivateKey.generateED25519().publicKey.toString()
                })
            });

            expect(response.ok).toBe(true);
            const { accountId } = await response.json();
            console.log('Created account:', accountId);

            // 2. Verify account exists on Hedera
            const balance = await new AccountBalanceQuery()
                .setAccountId(AccountId.fromString(accountId))
                .execute(client);
            console.log('Account balance:', balance.toString());
            expect(balance.hbars.toTinybars().toNumber()).toBeGreaterThan(0);

            // 3. Test authentication
            const session = await authenticateWallet(AccountId.fromString(accountId), operatorKey);
            expect(session).toBeTruthy();
        });
    });
}); 