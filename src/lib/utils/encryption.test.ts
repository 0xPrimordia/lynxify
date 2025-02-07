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
        const testData = 'test-private-key';
        const testPassword = 'test-password';

        const encrypted = await encrypt(testData, testPassword);
        const decrypted = await decrypt(encrypted, testPassword);
        expect(decrypted).toBe(testData);
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

    it('should fail decryption with wrong password', async () => {
        const testData = 'test-private-key';
        const testPassword = 'test-password';

        const encrypted = await encrypt(testData, testPassword);
        await expect(decrypt(encrypted, 'wrong-password'))
            .rejects.toThrow('Decryption failed');
    });

    it('should generate different ciphertexts for same data', async () => {
        const testData = 'test-private-key';
        const testPassword = 'test-password';

        const encrypted1 = await encrypt(testData, testPassword);
        const encrypted2 = await encrypt(testData, testPassword);
        expect(encrypted1).not.toBe(encrypted2);
    });
}); 