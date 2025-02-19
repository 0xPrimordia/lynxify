import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@nextui-org/react";
import { PasswordModalContext } from '../types';

interface PasswordModalProps {
    context: PasswordModalContext;
    password: string;
    setPassword: (password: string) => void;
    onSubmit: () => void;
    setContext: (context: PasswordModalContext | ((prev: PasswordModalContext) => PasswordModalContext)) => void;
    isSubmitting: boolean;
}

export const PasswordModal = ({ context, password, setPassword, onSubmit, setContext, isSubmitting }: PasswordModalProps) => (
    <Modal 
        isOpen={context.isOpen} 
        onClose={() => setContext(prev => ({
            ...prev,
            isOpen: false,
            transaction: null,
            transactionPromise: null
        }))}
    >
        <ModalContent>
            <ModalHeader>Enter Wallet Password</ModalHeader>
            <ModalBody>
                <p className="text-sm text-gray-600 mb-4">{context.description}</p>
                <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your wallet password"
                    disabled={isSubmitting}
                />
            </ModalBody>
            <ModalFooter>
                <Button 
                    onPress={onSubmit} 
                    color="primary"
                    isLoading={isSubmitting}
                    disabled={isSubmitting || !password}
                >
                    Submit
                </Button>
                <Button 
                    onPress={() => setContext(prev => ({
                        ...prev,
                        isOpen: false,
                        transaction: null,
                        transactionPromise: null
                    }))}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
            </ModalFooter>
        </ModalContent>
    </Modal>
); 