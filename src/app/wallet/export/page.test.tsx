import { render, fireEvent, act, waitFor, screen } from '@testing-library/react';
import ExportPage from './page';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { PrivateKey } from '@hashgraph/sdk';
import '@testing-library/jest-dom';
import { WalletOperationResult } from '@/app/types';
import { retrievePrivateKey } from '@/lib/utils/keyStorage';

// Mock both the context and the keyStorage
jest.mock('@/app/contexts/InAppWalletContext', () => ({
    useInAppWallet: jest.fn()
}));

jest.mock('@/lib/utils/keyStorage', () => ({
    retrievePrivateKey: jest.fn()
}));

describe('ExportPage', () => {
    // Use a specific private key that matches what we're getting back
    const mockPrivateKey = PrivateKey.fromString('3030020100300706052b8104000a0422042006032b657004220420e1454fd908b2b49eb4f21c9342579438028f1815ee954c');
    const mockPrivateKeyString = mockPrivateKey.toString();
    const mockInAppAccount = '0.0.123456';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Mock retrievePrivateKey to return a string
        (retrievePrivateKey as jest.Mock).mockResolvedValue(mockPrivateKeyString);

        // Mock the useInAppWallet hook with the full flow
        (useInAppWallet as jest.Mock).mockReturnValue({
            loadWallet: jest.fn().mockImplementation(async (password: string) => {
                if (password === 'correctpassword') {
                    return {
                        success: true,
                        data: mockPrivateKey
                    } as WalletOperationResult<PrivateKey>;
                }
                return {
                    success: false,
                    error: 'Invalid password'
                } as WalletOperationResult<PrivateKey>;
            }),
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

        expect(screen.getByText(/Warning: Your private key grants full access/)).toBeInTheDocument();
        expect(screen.getByTestId('private-key-display')).toHaveTextContent(mockPrivateKeyString);
    });

    it('toggles private key visibility', async () => {
        render(<ExportPage />);

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        const keyDisplay = screen.getByTestId('private-key-display');
        expect(keyDisplay).toHaveTextContent(mockPrivateKeyString);

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { 
                name: 'Toggle private key visibility'
            }));
        });

        expect(screen.queryByTestId('private-key-display')).not.toBeInTheDocument();
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

        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
        });

        expect(mockClipboard.writeText).toHaveBeenCalledWith(mockPrivateKeyString);
    });

    it('auto-hides private key after 5 minutes', async () => {
        render(<ExportPage />);

        await act(async () => {
            fireEvent.change(screen.getByPlaceholderText('Enter your wallet password'), {
                target: { value: 'correctpassword' }
            });
            fireEvent.submit(screen.getByText('Export Private Key').closest('form')!);
        });

        const keyDisplay = screen.getByTestId('private-key-display');
        expect(keyDisplay).toHaveTextContent(mockPrivateKeyString);

        act(() => {
            jest.advanceTimersByTime(5 * 60 * 1000);
        });

        expect(screen.queryByTestId('private-key-display')).not.toBeInTheDocument();
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

        const keyDisplay = screen.getByTestId('private-key-display');
        expect(keyDisplay).toHaveTextContent(mockPrivateKeyString);

        unmount();

        render(<ExportPage />);
        expect(screen.queryByTestId('private-key-display')).not.toBeInTheDocument();
    });
}); 