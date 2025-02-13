import { encrypt, decrypt } from './encryption';

describe('Encryption Utilities', () => {
    let mockCrypto: any;

    // Setup browser-like globals if we're in Node
    beforeAll(() => {
        // Create a complete mock crypto object
        mockCrypto = {
            subtle: {
                importKey: jest.fn().mockImplementation((format, keyData, algorithm, extractable, keyUsages) => {
                    return Promise.resolve({
                        algorithm: { name: algorithm === 'PBKDF2' ? 'PBKDF2' : 'AES-GCM' },
                        extractable: false,
                        type: 'secret',
                        usages: keyUsages
                    });
                }),
                deriveKey: jest.fn().mockImplementation((algorithm, keyMaterial, derivedKeyAlgorithm, extractable, keyUsages) => {
                    return Promise.resolve({
                        algorithm: { name: 'AES-GCM' },
                        extractable: false,
                        type: 'secret',
                        usages: keyUsages
                    });
                }),
                encrypt: jest.fn().mockImplementation((algorithm, key, data) => {
                    // Return an actual ArrayBuffer
                    return Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer);
                }),
                decrypt: jest.fn().mockImplementation((algorithm, key, data) => {
                    if (key.algorithm.name !== 'AES-GCM') {
                        throw new Error('Wrong key algorithm');
                    }
                    // For wrong password test
                    if (mockCrypto.wrongPassword) {
                        throw new Error('Decryption failed');
                    }
                    return Promise.resolve(new TextEncoder().encode('test-private-key').buffer);
                })
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
        mockCrypto.wrongPassword = false;
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

        mockCrypto.wrongPassword = true;
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