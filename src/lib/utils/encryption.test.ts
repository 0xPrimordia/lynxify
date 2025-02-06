import { encrypt, decrypt } from './encryption';

describe('Encryption Utilities', () => {
    let mockCrypto: any;

    // Setup browser-like globals if we're in Node
    beforeAll(() => {
        // Create a complete mock crypto object
        mockCrypto = {
            subtle: {
                importKey: jest.fn(),
                deriveKey: jest.fn(),
                encrypt: jest.fn(),
                decrypt: jest.fn()
            },
            getRandomValues: jest.fn((array) => {
                for (let i = 0; i < array.length; i++) {
                    array[i] = Math.floor(Math.random() * 256);
                }
                return array;
            })
        };

        // Replace global crypto
        Object.defineProperty(global, 'crypto', {
            value: mockCrypto,
            configurable: true
        });

        // Ensure TextEncoder/TextDecoder are available
        if (typeof TextEncoder === 'undefined') {
            const util = require('util');
            global.TextEncoder = util.TextEncoder;
            global.TextDecoder = util.TextDecoder;
        }
    });

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    it('should encrypt and decrypt data successfully', async () => {
        // Setup
        const testData = 'test secret data';
        const password = 'test-password-123';
        
        console.log('Test setup:', { testData, password });
        
        // Mock crypto subtle operations
        const mockKey = {} as CryptoKey;
        const mockEncrypted = new Uint8Array([1, 2, 3, 4]);
        
        mockCrypto.subtle.importKey.mockResolvedValue(mockKey);
        mockCrypto.subtle.deriveKey.mockResolvedValue(mockKey);
        mockCrypto.subtle.encrypt.mockResolvedValue(mockEncrypted);
        mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode(testData));

        // Test
        const encrypted = await encrypt(testData, password);
        console.log('Encrypted result:', encrypted);
        expect(encrypted).toBeDefined();
        expect(typeof encrypted).toBe('string');

        const decrypted = await decrypt(encrypted, password);
        console.log('Decrypted result:', decrypted);
        expect(decrypted).toBe(testData);

        // Log all crypto calls
        console.log('importKey calls:', mockCrypto.subtle.importKey.mock.calls);
        
        // Check first call only since encrypt and decrypt both call importKey
        const firstCall = mockCrypto.subtle.importKey.mock.calls[0];
        expect(firstCall[0]).toBe('raw');
        expect(ArrayBuffer.isView(firstCall[1])).toBe(true);  // Better check for TypedArrays
        expect(firstCall[2]).toBe('PBKDF2');
        expect(firstCall[3]).toBe(false);
        expect(firstCall[4]).toEqual(['deriveBits', 'deriveKey']);
    });

    it('should handle TextEncoder/TextDecoder correctly', async () => {
        const testString = 'Hello, 世界'; // Test with Unicode characters
        
        // Test TextEncoder
        const encoder = new TextEncoder();
        const encoded = encoder.encode(testString);
        console.log('Encoded type:', encoded.constructor.name);
        console.log('Encoded data:', encoded);
        
        // Test if it's actually a Uint8Array without using instanceof
        expect(Object.prototype.toString.call(encoded)).toBe('[object Uint8Array]');
        expect(encoded.length).toBeGreaterThan(0);
        
        // Test TextDecoder
        const decoder = new TextDecoder();
        const decoded = decoder.decode(encoded);
        console.log('Decoded result:', decoded);
        expect(decoded).toBe(testString);
    });

    it('should fail gracefully with invalid password', async () => {
        const testData = 'test secret data';
        const password = 'correct-password';
        const wrongPassword = 'wrong-password';

        // Mock crypto to simulate decryption failure
        mockCrypto.subtle.decrypt.mockRejectedValue(new Error('Decryption failed'));

        // First encrypt with correct password
        const encrypted = await encrypt(testData, password);

        // Then try to decrypt with wrong password
        await expect(decrypt(encrypted, wrongPassword))
            .rejects
            .toThrow('Decryption failed');
    });
}); 