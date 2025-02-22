import { render, fireEvent, act, waitFor, screen } from '@testing-library/react';
import ExportPage from '@/app/wallet/export/page';
import { InAppWalletProvider } from '@/app/contexts/InAppWalletContext';
import { PrivateKey } from '@hashgraph/sdk';
import { retrievePrivateKey, storePrivateKey } from '@/lib/utils/keyStorage';
import { TestWrapper } from '@/app/hooks/useAuthSession.setup';
import '@testing-library/jest-dom';
import { TEST_PRIVATE_KEY } from '@/app/hooks/useAuthSession.setup';

// Mock the ESM module first
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    base64StringToTransaction: jest.fn()
}));

// Mock keyStorage
jest.mock('@/lib/utils/keyStorage', () => ({
    retrievePrivateKey: jest.fn(),
    storePrivateKey: jest.fn()
}));

describe('Export Wallet Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        // Use the same test private key from the setup
        (retrievePrivateKey as jest.Mock).mockImplementation(async (userId: string, password: string) => {
            if (password === 'correctpassword') {
                return TEST_PRIVATE_KEY.toString();
            }
            throw new Error('Invalid password');
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should successfully retrieve and display private key', async () => {
        render(
            <TestWrapper>
                <ExportPage />
            </TestWrapper>
        );

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        // Use the data-testid to find the element containing the private key
        const keyDisplay = screen.getByTestId('private-key-display');
        expect(keyDisplay).toHaveTextContent(TEST_PRIVATE_KEY.toString());
    });

    it('should handle invalid password', async () => {
        render(
            <TestWrapper>
                <ExportPage />
            </TestWrapper>
        );

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'wrongpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        expect(screen.getByText('Invalid password')).toBeInTheDocument();
    });

    it('should auto-hide private key after timeout', async () => {
        render(
            <TestWrapper>
                <ExportPage />
            </TestWrapper>
        );

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        // Check key is initially visible
        const keyDisplay = screen.getByTestId('private-key-display');
        expect(keyDisplay).toHaveTextContent(TEST_PRIVATE_KEY.toString());

        // Fast-forward 5 minutes
        act(() => {
            jest.advanceTimersByTime(5 * 60 * 1000);
        });

        // Key should be hidden
        expect(screen.queryByTestId('private-key-display')).not.toBeInTheDocument();
        expect(screen.getByText('Export Private Key')).toBeInTheDocument();
    });
}); 