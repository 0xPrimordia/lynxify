import { SignAndExecuteTransactionParams } from '@hashgraph/hedera-wallet-connect';

export const handleExtensionTransaction = async (
    tx: string,
    account: string,
    signAndExecuteTransaction: (params: SignAndExecuteTransactionParams) => Promise<any>
) => {
    // Simple pass-through implementation matching production
    return signAndExecuteTransaction({
        transactionList: tx,
        signerAccountId: account
    });
}; 