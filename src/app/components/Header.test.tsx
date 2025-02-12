// Add this before other imports
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
  HederaSessionEvent: {},
  HederaJsonRpcMethod: {},
  DAppConnector: jest.fn()
}));

import { render, screen, act } from '@testing-library/react';
import Header from './Header';
import { useWalletContext } from '../hooks/useWallet';
import { useInAppWallet } from '../contexts/InAppWalletContext';
import { useNFTGate } from '../hooks/useNFTGate';
import { useRewards } from '../hooks/useRewards';
import { useSupabase } from '../hooks/useSupabase';

// Mock all hooks
jest.mock('../hooks/useWallet');
jest.mock('../contexts/InAppWalletContext');
jest.mock('../hooks/useNFTGate');
jest.mock('../hooks/useRewards');
jest.mock('../hooks/useSupabase');
jest.mock('@hashgraph/sdk', () => ({
    AccountBalanceQuery: jest.fn().mockImplementation(() => ({
        setAccountId: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({
            hbars: { toString: () => '100.00' }
        })
    })),
    AccountId: {
        fromString: jest.fn().mockReturnValue('0.0.123456')
    },
    Client: {
        forTestnet: jest.fn().mockReturnValue({ someClient: true }),
        forMainnet: jest.fn().mockReturnValue({ someClient: true })
    }
}));

describe('Header', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should display extension wallet balance', async () => {
        // Mock extension wallet connection
        (useWalletContext as jest.Mock).mockReturnValue({
            account: '0.0.123456',
            client: { someClient: true },
            error: null,
            handleConnect: jest.fn(),
            handleDisconnect: jest.fn(),
            setError: jest.fn()
        });

        // Mock in-app wallet as not active
        (useInAppWallet as jest.Mock).mockReturnValue({
            inAppAccount: null,
            isInAppWallet: false,
            client: null,
            error: null
        });

        // Mock other required hooks
        (useNFTGate as jest.Mock).mockReturnValue({
            hasAccess: true,
            isLoading: false
        });
        (useRewards as jest.Mock).mockReturnValue({
            fetchAchievements: jest.fn(),
            totalXP: 100
        });
        (useSupabase as jest.Mock).mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
                    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
                }
            }
        });

        const { debug } = render(<Header />);
        
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        debug(); // This will show us what's actually being rendered

        const balanceButtons = screen.getAllByRole('button', { 
            name: /100\.00 ℏ/i,
        });
        console.log('Found buttons:', balanceButtons.map(b => ({
            text: b.textContent,
            attrs: b.attributes
        })));
    });

    it('should display in-app wallet balance', async () => {
        // Mock extension wallet as not connected
        (useWalletContext as jest.Mock).mockReturnValue({
            account: null,
            client: null,
            error: null,
            handleConnect: jest.fn(),
            handleDisconnect: jest.fn(),
            setError: jest.fn()
        });

        // Mock in-app wallet as active
        (useInAppWallet as jest.Mock).mockReturnValue({
            inAppAccount: '0.0.789012',
            isInAppWallet: true,
            client: { someClient: true },
            error: null
        });

        // Mock other required hooks same as above
        (useNFTGate as jest.Mock).mockReturnValue({
            hasAccess: true,
            isLoading: false
        });
        (useRewards as jest.Mock).mockReturnValue({
            fetchAchievements: jest.fn(),
            totalXP: 100
        });
        (useSupabase as jest.Mock).mockReturnValue({
            supabase: {
                auth: {
                    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
                    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } })
                }
            }
        });

        render(<Header />);
        
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
        });

        const balanceButtons = screen.getAllByRole('button', { 
            name: /100\.00 ℏ/i,
        });
        const desktopButton = balanceButtons.find(button => button.getAttribute('data-slot') === 'trigger');
        expect(desktopButton).toBeTruthy();
        expect(desktopButton).toHaveAttribute('data-slot', 'trigger');
    });
}); 