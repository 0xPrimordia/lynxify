import { useState } from 'react';
import { PasswordModalContext } from '../types';

export const usePasswordModal = () => {
    const [password, setPassword] = useState("");
    const [passwordModalContext, setPasswordModalContext] = useState<PasswordModalContext>({
        isOpen: false,
        description: '',
        transaction: null,
        transactionPromise: null
    });

    const resetPasswordModal = () => {
        setPassword("");
        setPasswordModalContext({
            isOpen: false,
            description: '',
            transaction: null,
            transactionPromise: null
        });
    };

    return {
        password,
        setPassword,
        passwordModalContext,
        setPasswordModalContext,
        resetPasswordModal
    };
}; 