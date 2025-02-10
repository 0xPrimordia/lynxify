import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Setup Next.js request/response globals
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
global.Request = jest.fn() as unknown as typeof Request;
global.Response = jest.fn() as unknown as typeof Response;

global.setImmediate = setTimeout as unknown as typeof global.setImmediate;

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        auth: {
            getSession: jest.fn(),
            getUser: jest.fn()
        }
    }))
})); 