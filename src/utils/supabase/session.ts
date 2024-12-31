import { Session } from '@supabase/supabase-js';
import { SessionTypes } from '@walletconnect/types';
import { SessionState } from '@/app/types';
import { supabase } from '@/utils/supabase';

const SESSION_STORAGE_KEY = 'lynxify_session';

let isClearing = false;

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

export const clearStoredSession = async () => {
    if (isClearing) return; // Prevent multiple simultaneous clear attempts
    
    try {
        isClearing = true;
        
        // Clear local storage first
        localStorage.removeItem(SESSION_STORAGE_KEY);
        
        // Perform Supabase signout
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
        
        console.log('Session storage and auth cleared');
    } catch (error) {
        console.error('Error clearing session:', error);
        throw error;
    } finally {
        isClearing = false;
    }
};

export const handleDisconnectSessions = async (dAppConnector: any, sessions: any[]) => {
    try {
        // First disconnect WalletConnect sessions
        if (dAppConnector && sessions?.length > 0) {
            for (const session of sessions) {
                await dAppConnector.disconnect(session.topic);
            }
        }

        // Clear both stored session and Supabase auth
        await clearStoredSession();
        
        return true;
    } catch (error) {
        console.error('Error in handleDisconnectSessions:', error);
        // Still attempt to clear stored session on error
        localStorage.removeItem(SESSION_STORAGE_KEY);
        throw error;
    }
}; 