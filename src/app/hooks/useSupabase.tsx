'use client';

import { createClient } from '@supabase/supabase-js';
import { createContext, useContext, useState, useEffect } from 'react';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface SupabaseContextType {
    supabase: typeof supabase;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
    return (
        <SupabaseContext.Provider value={{ supabase }}>
            {children}
        </SupabaseContext.Provider>
    );
}

export function useSupabase() {
    const context = useContext(SupabaseContext);
    if (!context) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
} 