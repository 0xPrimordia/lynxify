import { ReactNode } from 'react';
import { WalletContext } from './useWallet';
import { InAppWalletContext } from '../contexts/InAppWalletContext';
import { SessionState } from '@/utils/supabase/session';
import { Client } from '@hashgraph/sdk';
import { Session, User } from '@supabase/supabase-js';
// Define strict mock state type
type MockSessionState = {
    wallet: {
        isConnected: boolean;
        accountId: string | null;
        session: null;
        isInAppWallet: boolean;
        privateKey: null;
    };
    auth: {
        isAuthenticated: boolean;
        userId: string | null;
        session: Session | null;
        user: User | null;
        error: string | null;
    };
};

export const mockWalletContext = {
    account: "",
    handleConnect: jest.fn(),
    handleDisconnectSessions: jest.fn(),
    signAndExecuteTransaction: jest.fn(),
    client: process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet(),
    appMetadata: {
        name: "Test App",
        description: "Test Description",
        icons: ["test-icon.png"],
        url: "http://localhost"
    },
    sessions: [],
    signers: [],
    extensions: [],
    dAppConnector: null,
    userId: null,
    isConnecting: false,
    error: null,
    sessionState: {
        wallet: {
            isConnected: false,
            accountId: null,
            session: null,
            isInAppWallet: false,
            privateKey: null
        },
        auth: {
            isAuthenticated: false,
            userId: null,
            session: null,
            user: null,
            error: null
        }
    } as MockSessionState,
    handleDisconnect: jest.fn(),
    setError: jest.fn(),
    walletType: null,
    setAccount: jest.fn(),
    setSessionState: jest.fn()
};

const mockInAppWalletContext = {
    inAppAccount: null,
    inAppPrivateKey: null,
    userId: null,
    createWallet: jest.fn(),
    loadWallet: jest.fn(),
    signTransaction: jest.fn(),
    isInAppWallet: false,
    backupKey: jest.fn(),
    recoverKey: jest.fn(),
    setInAppAccount: jest.fn(),
    client: process.env.NEXT_PUBLIC_HEDERA_NETWORK === 'mainnet' ? Client.forMainnet() : Client.forTestnet(),
    error: null
};

// Wrapper component for providing context in tests
export function TestWrapper({ children }: { children: ReactNode }) {
    return (
        <WalletContext.Provider value={mockWalletContext}>
            <InAppWalletContext.Provider value={mockInAppWalletContext}>
                {children}
            </InAppWalletContext.Provider>
        </WalletContext.Provider>
    );
}

// Helper to update session state in tests
export function updateSessionState(newState: Partial<typeof mockWalletContext.sessionState>) {
    mockWalletContext.sessionState = {
        ...mockWalletContext.sessionState,
        ...newState
    } as MockSessionState;
    mockWalletContext.setSessionState(mockWalletContext.sessionState);
}

// Helper to simulate session errors
export function simulateSessionError(error: string) {
    updateSessionState({
        auth: {
            ...mockWalletContext.sessionState.auth,
            error,
            isAuthenticated: false
        }
    });
}

// Reset all mocks between tests
export function resetMocks() {
    mockWalletContext.setSessionState.mockClear();
    mockInAppWalletContext.createWallet.mockClear();
    mockInAppWalletContext.loadWallet.mockClear();
    mockWalletContext.sessionState = {
        wallet: {
            isConnected: false,
            accountId: null,
            session: null,
            isInAppWallet: false,
            privateKey: null
        },
        auth: {
            isAuthenticated: false,
            userId: null,
            session: null,
            user: null,
            error: null
        }
    } as MockSessionState;
} 