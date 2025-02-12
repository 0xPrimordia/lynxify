import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
require('dotenv').config({ path: '.env.local' });

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

// Mock next/font
jest.mock('next/font/google', () => ({
  VT323: () => ({
    className: 'mocked-font',
    style: { fontFamily: 'mocked-font' },
  }),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
  }),
}));

// Global fetch mock
global.fetch = jest.fn();

// Mock IndexedDB
require('fake-indexeddb/auto'); 