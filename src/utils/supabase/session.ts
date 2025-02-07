import { Session } from '@supabase/supabase-js';
import { SessionTypes } from '@walletconnect/types';
import { PrivateKey } from "@hashgraph/sdk";
import { supabase } from '@/utils/supabase';
import { User } from '@supabase/supabase-js';

export interface SessionState {
    wallet: {
        isConnected: boolean;
        accountId: string | null;
        session: SessionTypes.Struct | null;
        isInAppWallet?: boolean;
        privateKey?: PrivateKey | null;
    };
    auth: {
        isAuthenticated: boolean;
        userId: string | null;
        session: Session | null;
        user: User | null;
    };
}

const SESSION_STORAGE_KEY = 'lynxify_session';

let isClearing = false;

export const persistSession = (
    walletSession: SessionTypes.Struct | null, 
    authSession: Session | null,
    isInAppWallet: boolean = false,
    privateKey: PrivateKey | null = null
) => {
    try {
        const sessionData: SessionState = {
            wallet: {
                isConnected: !!walletSession || isInAppWallet,
                accountId: walletSession?.namespaces?.hedera?.accounts?.[0]?.split(':').pop() || null,
                session: walletSession,
                isInAppWallet,
                privateKey
            },
            auth: {
                isAuthenticated: !!authSession,
                userId: authSession?.user?.id || null,
                session: authSession,
                user: authSession?.user || null
            }
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
        console.log('Session persisted:', {
            ...sessionData,
            wallet: {
                ...sessionData.wallet,
                privateKey: privateKey ? '[REDACTED]' : null
            }
        });
    } catch (error) {
        console.error('Error persisting session:', error);
    }
};

export const getStoredSession = (): SessionState | null => {
    try {
        const storedData = localStorage.getItem(SESSION_STORAGE_KEY);
        if (!storedData) return null;
        const sessionData = JSON.parse(storedData);
        
        // Convert stored private key string back to PrivateKey object if it exists
        if (sessionData.wallet.isInAppWallet && sessionData.wallet.privateKey) {
            sessionData.wallet.privateKey = PrivateKey.fromString(sessionData.wallet.privateKey.toString());
        }
        
        return sessionData;
    } catch (error) {
        console.error('Error retrieving stored session:', error);
        return null;
    }
};

export const clearStoredSession = async () => {
    if (isClearing) return; // Prevent multiple simultaneous clear attempts
    
    try {
        isClearing = true;
        localStorage.removeItem(SESSION_STORAGE_KEY);
        
        // Only sign out if we have an active session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            console.log('Session storage and auth cleared');
        }
    } catch (error) {
        console.error('Error clearing session:', error);
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