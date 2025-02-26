import { PasswordModalContext } from '@/app/types';
import { base64StringToTransaction } from "@hashgraph/hedera-wallet-connect";
import { TokenAssociateTransaction, TransferTransaction, ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';

interface DecodedTransaction extends Transaction {
    type?: string;
    functionParameters?: {
        toString: () => string;
    };
}

export const handleInAppTransaction = async (
    transaction: string,
    signTransaction: (transaction: string, password: string) => Promise<any>,
    setContext: (context: PasswordModalContext) => void
) => {
    // Decode the transaction to determine its type
    const decodedTransaction = base64StringToTransaction(transaction) as DecodedTransaction;
    
    // Set appropriate description based on transaction type and data
    let description = "Enter your password to confirm the transaction.";
    
    if (decodedTransaction.type === 'TokenAssociateTransaction') {
        description = "Enter your password to associate this token with your account. This is required before you can receive the token.";
    } else if (decodedTransaction.type === 'ContractExecuteTransaction') {
        // Check if this is an approval transaction by looking at the function signature
        const functionData = decodedTransaction.functionParameters?.toString() || '';
        const isApproval = functionData.includes('approve');
        
        description = isApproval 
            ? "Enter your password to approve the token for trading. This is required once before swapping."
            : "Enter your password to confirm the swap transaction.";
    }

    // Reset context before setting new one
    setContext({
        isOpen: false,
        transaction: null,
        description: '',
        transactionPromise: null
    });

    // Set the new context
    setContext({
        isOpen: true,
        transaction,
        description,
        transactionPromise: null
    });
};

export const handlePasswordSubmit = async (
    transaction: string,
    password: string,
    signTransaction: (tx: string, password: string) => Promise<any>,
    setPasswordModal: (context: PasswordModalContext) => void
) => {
    try {
        const result = await signTransaction(transaction, password);
        setPasswordModal({
            isOpen: false,
            description: '',
            transaction: null,
            transactionPromise: null
        });
        return result;
    } catch (error) {
        setPasswordModal({
            isOpen: false,
            description: '',
            transaction: null,
            transactionPromise: null
        });
        throw error;
    }
};

export const handleInAppPasswordSubmit = async (
    transaction: string,
    password: string,
    signTransaction: (tx: string, password: string) => Promise<any>,
    setPasswordModal: (context: PasswordModalContext) => void
) => {
    console.log('Starting password submission');
    try {
        const result = await signTransaction(transaction, password);
        console.log('Sign transaction result:', result);
        
        setPasswordModal({
            isOpen: false,
            description: '',
            transaction: null,
            transactionPromise: null
        });
        
        return result;
    } catch (error) {
        console.error('Password submission error:', error);
        setPasswordModal({
            isOpen: false,
            description: '',
            transaction: null,
            transactionPromise: null
        });
        throw error;
    }
}; 