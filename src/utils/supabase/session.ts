import { Session } from '@supabase/supabase-js';
import { SessionTypes } from '@walletconnect/types';
import { SessionState } from '@/app/types';

const SESSION_STORAGE_KEY = 'lynxify_session';

export const persistSession = (walletSession: SessionTypes.Struct | null, authSession: Session | null) => {
    try {
        const sessionData: SessionState = {
            wallet: {
                isConnected: !!walletSession,
                accountId: walletSession?.namespaces?.hedera?.accounts?.[0]?.split(':').pop() || null,
                session: walletSession
            },
            auth: {
                isAuthenticated: !!authSession,
                userId: authSession?.user?.id || null,
                session: authSession
            }
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        console.log('Session persisted:', sessionData);
    } catch (error) {
        console.error('Error persisting session:', error);
    }
};

export const getStoredSession = (): SessionState | null => {
    try {
        const storedData = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!storedData) return null;
        return JSON.parse(storedData);
    } catch (error) {
        console.error('Error retrieving stored session:', error);
        return null;
    }
};

export const clearStoredSession = () => {
    try {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        console.log('Session storage cleared');
    } catch (error) {
        console.error('Error clearing session storage:', error);
    }
}; 