import '@testing-library/jest-dom';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import SecurityPage from './page';
import { useInAppWallet } from '@/app/contexts/InAppWalletContext';
import { Client } from "@hashgraph/sdk";

// Mock the ESM module
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    base64StringToTransaction: jest.fn()
}));

// Mock the hooks
jest.mock('@/app/contexts/InAppWalletContext', () => ({
    useInAppWallet: jest.fn()
}));

describe('SecurityPage', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
        
        // Mock the useInAppWallet hook implementation
        (useInAppWallet as jest.Mock).mockReturnValue({
            loadWallet: jest.fn().mockResolvedValue('mock-private-key'),
            client: Client.forTestnet()
        });
    });

    it('should clear private key when unmounting', async () => {
        const { getByText, getByPlaceholderText, unmount, debug } = render(<SecurityPage />);

        // Enter password and show key
        fireEvent.change(getByPlaceholderText('Enter wallet password'), { 
            target: { value: 'TestPassword123!' } 
        });

        await act(async () => {
            fireEvent.submit(getByPlaceholderText('Enter wallet password').closest('form')!);
        });

        // Debug the component state
        debug();

        // Verify warning message is shown (indicates successful key load)
        await waitFor(() => {
            expect(getByText(/Never share your private key/)).toBeInTheDocument();
        });

        // Unmount component
        unmount();

        // Verify warning is not present after remount
        const { queryByText } = render(<SecurityPage />);
        expect(queryByText(/Never share your private key/)).not.toBeInTheDocument();
    });

    it('should auto-hide private key after timeout', async () => {
        jest.useFakeTimers();

        const { getByText, getByPlaceholderText, queryByText } = render(<SecurityPage />);

        // Show the key
        fireEvent.change(getByPlaceholderText('Enter wallet password'), { 
            target: { value: 'TestPassword123!' } 
        });

        await act(async () => {
            fireEvent.submit(getByPlaceholderText('Enter wallet password').closest('form')!);
        });

        // Verify warning message is shown
        await waitFor(() => {
            expect(getByText(/Never share your private key/)).toBeInTheDocument();
        });

        // Fast-forward 5 minutes
        act(() => {
            jest.advanceTimersByTime(5 * 60 * 1000);
        });

        // Verify warning is hidden
        expect(queryByText(/Never share your private key/)).not.toBeInTheDocument();

        jest.useRealTimers();
    });
}); 