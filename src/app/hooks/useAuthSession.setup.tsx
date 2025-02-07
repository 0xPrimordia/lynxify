import { ReactNode } from 'react';
import { WalletContext } from './useWallet';
import { InAppWalletContext } from '../contexts/InAppWalletContext';

// Mock context values
const mockWalletContext = {
    sessionState: {
        wallet: {
            isConnected: false,
            accountId: null,
            session: null
        },
        auth: {
            isAuthenticated: false,
            userId: null,
            session: null,
            error: null
        }
    },
    setSessionState: jest.fn(),
    // ... other required context values
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
    recoverKey: jest.fn()
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
    };
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
    // Reset session state
    mockWalletContext.sessionState = {
        wallet: {
            isConnected: false,
            accountId: null,
            session: null
        },
        auth: {
            isAuthenticated: false,
            userId: null,
            session: null,
            error: null
        }
    };
} 