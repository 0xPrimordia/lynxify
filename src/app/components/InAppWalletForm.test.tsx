import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InAppWalletForm } from './InAppWalletForm';
import { WalletProvider } from '@/app/hooks/useWallet';

jest.mock('@/lib/utils/sessionPassword');

describe('InAppWalletForm', () => {
    beforeEach(() => {
        render(
            <WalletProvider>
                <InAppWalletForm />
            </WalletProvider>
        );
    });

    it('should validate email format', async () => {
        const emailInput = screen.getByLabelText(/email/i);
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        
        const submitButton = screen.getByRole('button', { name: /create account/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
        });
    });

    it('should validate password requirements', async () => {
        const passwordInput = screen.getByLabelText(/^password$/i);
        fireEvent.change(passwordInput, { target: { value: 'weak' } });
        
        const submitButton = screen.getByRole('button', { name: /create account/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
        });
    });

    it('should show verification sent message on successful submission', async () => {
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'TestPassword123!' } });
        fireEvent.change(confirmInput, { target: { value: 'TestPassword123!' } });

        const submitButton = screen.getByRole('button', { name: /create account/i });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/check your email/i)).toBeInTheDocument();
        });
    });
}); 