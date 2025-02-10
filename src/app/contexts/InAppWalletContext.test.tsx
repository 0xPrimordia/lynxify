import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { InAppWalletProvider, useInAppWallet } from './InAppWalletContext';
import { supabase } from '@/utils/supabase';

// Only need to mock Supabase auth
jest.mock('@/utils/supabase', () => ({
    supabase: {
        auth: {
            getSession: jest.fn()
        }
    }
}));

// Simple test component to display wallet state
const TestComponent = () => {
    const { inAppAccount, isInAppWallet } = useInAppWallet();
    return (
        <div>
            <div data-testid="account-id">{inAppAccount || 'No Account'}</div>
            <div data-testid="is-inapp-wallet">{isInAppWallet.toString()}</div>
        </div>
    );
};

describe('InAppWalletContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should detect existing in-app wallet from session', async () => {
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({
            data: {
                session: {
                    user: {
                        user_metadata: {
                            isInAppWallet: true,
                            hederaAccountId: '0.0.123456'
                        }
                    }
                }
            }
        });

        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-inapp-wallet')).toHaveTextContent('true');
            expect(screen.getByTestId('account-id')).toHaveTextContent('0.0.123456');
        });
    });

    it('should handle session without in-app wallet', async () => {
        (supabase.auth.getSession as jest.Mock).mockResolvedValue({
            data: {
                session: {
                    user: {
                        user_metadata: {}
                    }
                }
            }
        });

        render(
            <InAppWalletProvider>
                <TestComponent />
            </InAppWalletProvider>
        );

        await waitFor(() => {
            expect(screen.getByTestId('is-inapp-wallet')).toHaveTextContent('false');
            expect(screen.getByTestId('account-id')).toHaveTextContent('No Account');
        });
    });
}); 