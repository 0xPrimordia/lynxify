import { Client, AccountId, PrivateKey } from "@hashgraph/sdk";
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

export function validateTestEnvironment() {
    const requiredEnvVars = [
        'NEXT_PUBLIC_OPERATOR_ID',
        'OPERATOR_KEY',
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missing = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}

export function setupTestClient() {
    const client = Client.forTestnet();
    const operatorId = AccountId.fromString(process.env.NEXT_PUBLIC_OPERATOR_ID!);
    const operatorKey = PrivateKey.fromString(process.env.OPERATOR_KEY!);
    
    client.setOperator(operatorId, operatorKey);
    
    return { client, operatorId, operatorKey };
}

export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
); 