import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InAppWalletForm } from './InAppWalletForm';
import { supabase } from '@/utils/supabase';

// Mock Supabase
jest.mock('@/utils/supabase', () => ({
    supabase: {
        auth: {
            signUp: jest.fn()
        }
    }
}));

describe('InAppWalletForm', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should validate email format', async () => {
        render(<InAppWalletForm />);
        const emailInput = screen.getByLabelText(/email/i);
        
        fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
        fireEvent.submit(screen.getByTestId('wallet-form'));

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/invalid email address/i);
        });
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should validate password requirements', async () => {
        render(<InAppWalletForm />);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        
        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'weak' } });
        fireEvent.submit(screen.getByTestId('wallet-form'));

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/password must be at least 12 characters/i);
        });
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should validate password confirmation match', async () => {
        render(<InAppWalletForm />);
        
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmInput, { target: { value: 'DifferentPassword123!' } });

        fireEvent.submit(screen.getByTestId('wallet-form'));

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/passwords do not match/i);
        });
        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('should show verification sent message on successful submission', async () => {
        (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({ error: null });
        
        render(<InAppWalletForm />);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmInput, { target: { value: 'StrongPassword123!' } });

        fireEvent.submit(screen.getByTestId('wallet-form'));

        await waitFor(() => {
            expect(screen.getByTestId('verification-heading')).toBeInTheDocument();
        });
        expect(supabase.auth.signUp).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'StrongPassword123!',
            options: {
                emailRedirectTo: expect.any(String),
                data: {
                    campaign_id: undefined
                }
            }
        });
    });

    it('should handle rate limiting errors', async () => {
        (supabase.auth.signUp as jest.Mock).mockRejectedValueOnce({
            message: 'Too many requests',
            status: 429
        });

        render(<InAppWalletForm />);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmInput, { target: { value: 'StrongPassword123!' } });

        fireEvent.submit(screen.getByTestId('wallet-form'));

        await waitFor(() => {
            expect(screen.getByTestId('error-message')).toHaveTextContent(/too many requests/i);
            expect(screen.getByTestId('retry-countdown')).toHaveTextContent(/60/);
        });
    });

    it('should disable submit button during submission', async () => {
        // Mock signUp to never resolve during this test
        (supabase.auth.signUp as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

        render(<InAppWalletForm />);
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmInput, { target: { value: 'StrongPassword123!' } });

        const submitButton = screen.getByTestId('submit-button');
        fireEvent.submit(screen.getByTestId('wallet-form'));

        expect(submitButton).toBeDisabled();
        expect(submitButton).toHaveTextContent('Creating Account...');
    });

    it('should include campaign ID in signup metadata when provided', async () => {
        const campaignId = 'ETHD_VIP_001';
        render(<InAppWalletForm campaignId={campaignId} />);
        
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmInput, { target: { value: 'StrongPassword123!' } });

        fireEvent.submit(screen.getByTestId('wallet-form'));

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'StrongPassword123!',
                options: {
                    emailRedirectTo: expect.any(String),
                    data: {
                        campaign_id: campaignId
                    }
                }
            });
        });
    });

    it('should not include campaign ID in metadata when not provided', async () => {
        (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({ error: null });
        
        render(<InAppWalletForm />);
        
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^password$/i);
        const confirmInput = screen.getByLabelText(/confirm password/i);

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'StrongPassword123!' } });
        fireEvent.change(confirmInput, { target: { value: 'StrongPassword123!' } });

        fireEvent.submit(screen.getByTestId('wallet-form'));

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'StrongPassword123!',
                options: {
                    emailRedirectTo: expect.any(String),
                    data: {
                        campaign_id: undefined
                    }
                }
            });
        });
    });
}); 