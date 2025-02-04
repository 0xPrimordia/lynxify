import { PrivateKey, AccountId } from "@hashgraph/sdk";
import { fetch } from 'cross-fetch';

export async function authenticateWallet(operatorId: AccountId, operatorKey: PrivateKey) {
    const message = "Test XP Rewards";
    const signature = await operatorKey.sign(Buffer.from(message));
    const signatureHex = Buffer.from(signature).toString('hex');

    console.log('\nAuthenticating with wallet...');
    const authResponse = await fetch('http://localhost:3000/api/auth/wallet-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            accountId: operatorId.toString(),
            signature: signatureHex,
            message
        })
    });

    if (!authResponse.ok) {
        throw new Error(`Authentication failed: ${await authResponse.text()}`);
    }

    const { session } = await authResponse.json();
    console.log('Authentication successful');
    return session;
} 