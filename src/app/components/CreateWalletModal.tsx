import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, Button, Input } from "@nextui-org/react";
import { useWalletCreation } from '@/hooks/useWalletCreation';
import { useWalletContext } from "@/app/hooks/useWallet";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function CreateWalletModal({ 
    isOpen, 
    onClose 
}: { 
    isOpen: boolean; 
    onClose: () => void;
}) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const { createNewWallet, isCreating, error } = useWalletCreation();
    const { handleConnect } = useWalletContext();
    const supabase = createClientComponentClient();

    const handleCreate = async () => {
        if (password !== confirmPassword) {
            alert("Passwords don't match!");
            return;
        }

        try {
            // First create a Supabase user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error('No user data returned from signup');
            }

            // Now create the wallet
            const wallet = await createNewWallet(password);
            
            // After wallet creation, trigger the normal connect flow
            await handleConnect();
            onClose();
        } catch (err) {
            console.error('Error creating wallet:', err);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent>
                <ModalHeader>Create New Wallet</ModalHeader>
                <ModalBody className="gap-4">
                    <p className="text-sm text-gray-600">
                        Create a new wallet to start using Lynxify. Make sure to save your password!
                    </p>
                    <Input
                        type="email"
                        label="Email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <Input
                        type="password"
                        label="Password"
                        placeholder="Enter a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Input
                        type="password"
                        label="Confirm Password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {error && (
                        <p className="text-red-500 text-sm">{error}</p>
                    )}
                    <Button
                        color="primary"
                        onClick={handleCreate}
                        isLoading={isCreating}
                    >
                        Create Wallet
                    </Button>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
} 