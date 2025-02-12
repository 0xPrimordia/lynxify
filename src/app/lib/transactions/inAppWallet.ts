import { PasswordModalContext } from '@/app/types';

export const handleInAppTransaction = async (
    tx: string, 
    description: string,
    setPasswordModal: (context: PasswordModalContext | ((prev: PasswordModalContext) => PasswordModalContext)) => void
) => {
    console.log('handleInAppTransaction called:', {
        txLength: tx.length,
        description
    });
    
    return new Promise((resolve, reject) => {
        setPasswordModal({
            isOpen: true,
            description,
            transaction: tx,
            transactionPromise: { resolve, reject }
        });
        console.log('Password modal state set');
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