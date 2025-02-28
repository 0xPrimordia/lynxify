import { PasswordModalContext } from '@/app/types';
import { base64StringToTransaction } from "@hashgraph/hedera-wallet-connect";
import { TokenAssociateTransaction, TransferTransaction, ContractExecuteTransaction, Transaction } from '@hashgraph/sdk';
import { withTimeout } from '../utils/timeout';

interface DecodedTransaction extends Transaction {
    type?: string;
    functionParameters?: {
        toString: () => string;
    };
}

export const handleInAppTransaction = async (
    transaction: string,
    signTransaction: (transaction: string, password: string) => Promise<any>,
    setContext: (context: PasswordModalContext | ((prevContext: PasswordModalContext) => PasswordModalContext)) => void
) => {
    console.log('[handleInAppTransaction] Starting transaction flow');
    
    // Show password modal immediately with default description
    console.log('[handleInAppTransaction] Setting modal context to open');
    setContext({
        isOpen: true,
        transaction,
        description: "Enter your password to confirm the transaction.",
        transactionPromise: null // This will be set by the caller
    });

    console.log('[handleInAppTransaction] Creating promise for transaction handling');
    return new Promise((resolve, reject) => {
        console.log('[handleInAppTransaction] Setting transaction promise in context');
        setContext((prevContext: PasswordModalContext) => {
            console.log('[handleInAppTransaction] Previous context:', prevContext);
            const newContext = {
                ...prevContext,
                transactionPromise: { resolve, reject }
            };
            console.log('[handleInAppTransaction] New context:', newContext);
            return newContext;
        });
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
    console.log('[handleInAppPasswordSubmit] Starting password submission');
    try {
        // First try to decode the transaction to determine its type
        try {
            console.log('[handleInAppPasswordSubmit] Attempting to decode transaction');
            const decodedTransaction = base64StringToTransaction(transaction) as DecodedTransaction;
            let description = "Enter your password to confirm the transaction.";
            
            if (decodedTransaction.type === 'TokenAssociateTransaction') {
                description = "Enter your password to associate this token with your account. This is required before you can receive the token.";
            } else if (decodedTransaction.type === 'ContractExecuteTransaction') {
                const functionData = decodedTransaction.functionParameters?.toString() || '';
                const isApproval = functionData.includes('approve');
                
                description = isApproval 
                    ? "Enter your password to approve the token for trading. This is required once before swapping."
                    : "Enter your password to confirm the swap transaction.";
            }
            console.log('[handleInAppPasswordSubmit] Transaction decoded, type:', decodedTransaction.type);

            // Update modal with specific description
            console.log('[handleInAppPasswordSubmit] Updating modal with specific description:', description);
            setPasswordModal({
                isOpen: true,
                transaction,
                description,
                transactionPromise: null
            });
        } catch (error: unknown) {
            console.error('[handleInAppPasswordSubmit] Transaction decode failed:', error);
        }

        console.log('[handleInAppPasswordSubmit] Attempting to sign transaction');
        // Add timeout to prevent hanging
        try {
            const result = await withTimeout(
                signTransaction(transaction, password),
                30000, // 30 seconds timeout
                'Transaction signing timed out. The network might be congested or there could be a connection issue.'
            );
            
            console.log('[handleInAppPasswordSubmit] Sign transaction result:', result);
            
            if (!result.success) {
                console.error('[handleInAppPasswordSubmit] Transaction signing failed:', result.error);
                throw new Error(result.error || 'Transaction failed');
            }
            
            setPasswordModal({
                isOpen: false,
                description: '',
                transaction: null,
                transactionPromise: null
            });
            
            return result.data;
        } catch (error: unknown) {
            console.error('[handleInAppPasswordSubmit] Password submission error:', error);
            // Keep modal open on password error
            if (error instanceof Error && (error.message === 'OperationError' || error.message.includes('Decryption failed'))) {
                console.log('[handleInAppPasswordSubmit] Password error, keeping modal open');
                throw new Error('Invalid password. Please try again.');
            }
            // Close modal on other errors
            console.log('[handleInAppPasswordSubmit] Non-password error, closing modal');
            setPasswordModal({
                isOpen: false,
                description: '',
                transaction: null,
                transactionPromise: null
            });
            return { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
        }
    } catch (error: unknown) {
        console.error('[handleInAppPasswordSubmit] Password submission error:', error);
        // Keep modal open on password error
        if (error instanceof Error && (error.message === 'OperationError' || error.message.includes('Decryption failed'))) {
            console.log('[handleInAppPasswordSubmit] Password error, keeping modal open');
            throw new Error('Invalid password. Please try again.');
        }
        // Close modal on other errors
        console.log('[handleInAppPasswordSubmit] Non-password error, closing modal');
        setPasswordModal({
            isOpen: false,
            description: '',
            transaction: null,
            transactionPromise: null
        });
        return { status: 'ERROR', error: error instanceof Error ? error.message : 'Unknown error' };
    }
}; 