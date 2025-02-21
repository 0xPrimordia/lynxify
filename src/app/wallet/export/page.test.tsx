import { render, fireEvent, act, waitFor, screen } from '@testing-library/react';
import ExportPage from './page';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { PrivateKey } from '@hashgraph/sdk';
import '@testing-library/jest-dom';
import { WalletOperationResult } from '@/app/types';

// Mock the hooks
jest.mock('@/app/contexts/InAppWalletContext', () => ({
    useInAppWallet: jest.fn()
}));

describe('ExportPage', () => {
    const mockPrivateKey = PrivateKey.generateED25519();
    const mockInAppAccount = '0.0.123456';

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Mock the useInAppWallet hook with proper WalletOperationResult type
        (useInAppWallet as jest.Mock).mockReturnValue({
            loadWallet: jest.fn().mockResolvedValue({
                success: true,
                data: mockPrivateKey
            } as WalletOperationResult<PrivateKey>),
            inAppAccount: mockInAppAccount
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('renders the export page with account ID', () => {
        render(<ExportPage />);
        expect(screen.getByText('Export Wallet')).toBeInTheDocument();
        expect(screen.getByText(mockInAppAccount)).toBeInTheDocument();
    });

    it('shows error message on invalid password', async () => {
        // Mock loadWallet to return error
        (useInAppWallet as jest.Mock).mockReturnValue({
            loadWallet: jest.fn().mockResolvedValue({
                success: false,
                error: 'Invalid password'
            } as WalletOperationResult<PrivateKey>),
            inAppAccount: mockInAppAccount
        });

        render(<ExportPage />);

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'wrongpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        expect(screen.getByText('Invalid password')).toBeInTheDocument();
    });

    it('successfully displays private key when correct password is provided', async () => {
        render(<ExportPage />);

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        // Verify warning message is shown
        expect(screen.getByText(/Warning: Your private key grants full access/)).toBeInTheDocument();
        
        // Verify private key is shown
        expect(screen.getByText(mockPrivateKey.toString())).toBeInTheDocument();
    });

    it('toggles private key visibility', async () => {
        render(<ExportPage />);

        // First show the private key
        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        // Initially visible
        const privateKeyText = mockPrivateKey.toString();
        expect(screen.getByText(privateKeyText)).toBeInTheDocument();

        // Toggle visibility off
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { 
                name: 'Toggle private key visibility'
            }));
        });

        // Should hide the private key
        expect(screen.queryByText(privateKeyText)).not.toBeInTheDocument();
    });

    it('copies private key to clipboard', async () => {
        const mockClipboard = {
            writeText: jest.fn().mockResolvedValue(undefined)
        };
        Object.assign(navigator, { clipboard: mockClipboard });

        render(<ExportPage />);

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        // Click copy button and handle state updates
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
        });

        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockPrivateKey.toString());
    });

    it('auto-hides private key after 5 minutes', async () => {
        render(<ExportPage />);

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        // Verify key is shown
        expect(screen.getByText(mockPrivateKey.toString())).toBeInTheDocument();

        // Fast-forward 5 minutes
        act(() => {
            jest.advanceTimersByTime(5 * 60 * 1000);
        });

        // Key should be hidden
        expect(screen.queryByText(mockPrivateKey.toString())).not.toBeInTheDocument();
        expect(screen.getByText('Export Private Key')).toBeInTheDocument();
    });

    it('clears private key when component unmounts', async () => {
        const { unmount } = render(<ExportPage />);

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        // Verify key is shown
        expect(screen.getByText(mockPrivateKey.toString())).toBeInTheDocument();

        // Unmount component
        unmount();

        // Remount and verify key is cleared
        render(<ExportPage />);
        expect(screen.queryByText(mockPrivateKey.toString())).not.toBeInTheDocument();
    });
}); 