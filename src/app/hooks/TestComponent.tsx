import { useWalletContext } from '../hooks/useWallet';
import { useInAppWallet } from '../contexts/InAppWalletContext';
import SessionPasswordManager from '@/lib/utils/sessionPassword';

export function TestComponent() {
    const { sessionState } = useWalletContext();
    const { inAppAccount } = useInAppWallet();

    const handleRetry = async () => {
        try {
            await SessionPasswordManager.getPassword();
        } catch (error) {
            // Error handling is tested through the component state
        }
    };

    return (
        <div>
            <div data-testid="session-status">
                {!sessionState ? 'Loading' : 
                    sessionState.auth.isAuthenticated ? 'Active' : 
                    sessionState.auth.error?.includes('401') ? 'Unauthorized' : 'Expired'}
            </div>
            {inAppAccount && (
                <div data-testid="account">{inAppAccount}</div>
            )}
            {sessionState?.auth?.error && (
                <div data-testid="error-message">{sessionState.auth.error}</div>
            )}
            <button 
                data-testid="retry-button" 
                onClick={handleRetry}
            >
                Retry Password
            </button>
            {/* For testing lockout countdown */}
            {sessionState?.auth?.error?.includes('Locked out') && (
                <div data-testid="countdown">
                    {sessionState.auth.error.match(/\d+/)?.[0]} seconds
                </div>
            )}
        </div>
    );
} 