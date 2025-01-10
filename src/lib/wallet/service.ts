import { 
    Mnemonic,
    PrivateKey,
    PublicKey
} from "@hashgraph/sdk";
import { encrypt } from './crypto';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export interface WalletConfig {
    encryptedMnemonic: string;
    encryptedPrivateKey: string;
    publicKey: string;
    accountId: string;
    lastAccessed: Date;
}

export class WalletService {
    private supabase = createClientComponentClient();

    async createWallet(password: string): Promise<WalletConfig> {
        try {
            // Generate mnemonic and keys (this is safe client-side)
            const mnemonic = await Mnemonic.generate();
            const privateKey = await mnemonic.toPrivateKey();
            const publicKey = privateKey.publicKey;

            // Send public key to server for account creation
            const response = await fetch('/api/wallet/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    publicKey: publicKey.toString()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to create Hedera account');
            }

            const { accountId } = await response.json();

            // Encrypt sensitive data client-side
            const encryptedMnemonic = await encrypt(mnemonic.toString(), password);
            const encryptedPrivateKey = await encrypt(privateKey.toString(), password);

            const walletConfig: WalletConfig = {
                encryptedMnemonic,
                encryptedPrivateKey,
                publicKey: publicKey.toString(),
                accountId,
                lastAccessed: new Date()
            };

            // Store encrypted wallet data
            const { error } = await this.supabase
                .from('user_wallets')
                .insert([{
                    encrypted_wallet: JSON.stringify(walletConfig),
                    public_key: walletConfig.publicKey,
                    account_id: accountId
                }]);

            if (error) throw error;

            return walletConfig;
        } catch (error) {
            console.error('Error creating wallet:', error);
            throw error;
        }
    }
} 