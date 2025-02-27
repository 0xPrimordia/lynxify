import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { ethers } from 'ethers';
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

// Mock hedera-wallet-connect
jest.mock('@hashgraph/hedera-wallet-connect', () => ({
    transactionToBase64String: jest.fn().mockImplementation((tx) => 'mock_base64_string')
}));

// Mock axios for Mirror Node calls
jest.mock('axios', () => ({
    post: jest.fn().mockImplementation(() => Promise.resolve({
        data: {
            result: '0x0000000000000000000000000000000000000000000000000000000000000064' // Properly formatted hex
        }
    }))
}));

// Mock quoter interface
jest.mock('@/app/lib/quoter', () => ({
    ...jest.requireActual('@/app/lib/quoter'),
    getQuoteExactInput: jest.fn().mockImplementation(() => Promise.resolve(BigInt(100))),
    encodeFunctionData: jest.fn().mockImplementation(() => '0x')
}));

// Mock token associations and approvals
jest.mock('@/app/lib/utils/tokens', () => ({
    ...jest.requireActual('@/app/lib/utils/tokens'),
    checkTokenAssociation: jest.fn().mockImplementation(() => Promise.resolve(true)),
    getTokenAllowance: jest.fn().mockImplementation(() => Promise.resolve(true))
}));

// Mock swap functions with error handling
jest.mock('@/app/lib/trades/hbarToToken', () => ({
    ...jest.requireActual('@/app/lib/trades/hbarToToken'),
    swapHbarToToken: jest.fn().mockImplementation((amount) => {
        if (amount === Number.MAX_SAFE_INTEGER.toString()) {
            throw new Error('Insufficient balance for swap');
        }
        return Promise.resolve({ type: 'swap', tx: 'mock_tx' });
    })
}));

jest.mock('@/app/lib/trades/tokenToToken', () => ({
    ...jest.requireActual('@/app/lib/trades/tokenToToken'),
    swapTokenToToken: jest.fn().mockImplementation(() => Promise.resolve({ type: 'swap', tx: 'mock_tx' }))
}));

// Mock fetch for price data
global.fetch = jest.fn(() => 
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
            { timestamp: Date.now(), price: 1.0 }
        ])
    })
) as jest.Mock;

// Mock IndexedDB
require('fake-indexeddb/auto');

// Ensure environment variables
beforeAll(() => {
    process.env.NEXT_PUBLIC_OPERATOR_ID = process.env.NEXT_PUBLIC_OPERATOR_ID || '0.0.123';
    process.env.OPERATOR_KEY = process.env.OPERATOR_KEY || '302e020100300506032b657004220420...';
    process.env.NEXT_PUBLIC_SAUCE_TOKEN_ID = process.env.NEXT_PUBLIC_SAUCE_TOKEN_ID || '0.0.456';
    process.env.NEXT_PUBLIC_CLXY_TOKEN_ID = process.env.NEXT_PUBLIC_CLXY_TOKEN_ID || '0.0.789';
});

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
}); 