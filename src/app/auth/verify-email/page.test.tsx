import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import VerifyEmailPage from './page';
import { useSearchParams } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn(() => ({
        get: jest.fn()
    })),
    useRouter: () => ({ push: jest.fn() })
}));

// Mock CreateWalletForm component
jest.mock('@/app/components/CreateWalletForm', () => {
    return function MockCreateWalletForm() {
        return <div data-testid="create-wallet-form">Create Wallet Form</div>;
    };
});

describe('VerifyEmailPage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders CreateWalletForm when no error parameter is present', () => {
        (useSearchParams as jest.Mock).mockReturnValue({
            get: () => null
        });

        render(<VerifyEmailPage />);
        
        expect(screen.getByTestId('create-wallet-form')).toBeInTheDocument();
        expect(screen.queryByText('Verification Failed')).not.toBeInTheDocument();
    });

    it('displays error message when error parameter is present', () => {
        const errorMessage = 'Verification failed';
        (useSearchParams as jest.Mock).mockReturnValue({
            get: () => errorMessage
        });

        render(<VerifyEmailPage />);
        
        expect(screen.getByText('Verification Failed')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(screen.queryByTestId('create-wallet-form')).not.toBeInTheDocument();
    });
}); 