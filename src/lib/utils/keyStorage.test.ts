import { storePrivateKey, retrievePrivateKey, getStoredKey } from './keyStorage';
import { PrivateKey } from "@hashgraph/sdk";
import 'fake-indexeddb/auto';  // This will automatically mock IndexedDB

// Mock the crypto functions with proper key structure
const mockCrypto = {
    subtle: {
        importKey: jest.fn().mockImplementation((format, keyData, algorithm, extractable, keyUsages) => {
            console.log('importKey called with:', { format, algorithm, extractable, keyUsages });
            if (algorithm === 'PBKDF2') {
                return Promise.resolve({
                    algorithm: { name: 'PBKDF2' },
                    extractable: false,
                    type: 'secret',
                    usages: ['deriveBits', 'deriveKey']
                });
            }
            return Promise.resolve({
                algorithm: { name: 'AES-GCM' },
                extractable: false,
                type: 'secret',
                usages: ['encrypt', 'decrypt']
            });
        }),
        deriveKey: jest.fn().mockImplementation((algorithm, keyMaterial, derivedKeyAlgorithm, extractable, keyUsages) => {
            console.log('deriveKey called with:', { algorithm, derivedKeyAlgorithm, extractable, keyUsages });
            return Promise.resolve({
                algorithm: { name: 'AES-GCM' },
                extractable: false,
                type: 'secret',
                usages: keyUsages
            });
        }),
        encrypt: jest.fn().mockImplementation((algorithm, key, data) => {
            console.log('encrypt called with:', { algorithm, data });
            return Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer);
        }),
        decrypt: jest.fn().mockImplementation((algorithm, key, data) => {
            console.log('decrypt called with:', { algorithm, data });
            return Promise.resolve(new TextEncoder().encode('mockDecryptedKey').buffer);
        }),
        generateKey: jest.fn().mockImplementation((...args) => {
            console.log('generateKey called with:', args);
            return Promise.resolve({
                algorithm: { name: 'AES-GCM' },
                extractable: true,
                type: 'secret',
                usages: ['encrypt', 'decrypt']
            });
        }),
        exportKey: jest.fn().mockImplementation((...args) => {
            console.log('exportKey called with:', args);
            return Promise.resolve(new Uint8Array([1, 2, 3, 4]).buffer);
        })
    },
    getRandomValues: jest.fn().mockReturnValue(new Uint8Array(12))
};

// Mock the global crypto object
global.crypto = mockCrypto as unknown as Crypto;

// Mock the TextEncoder/Decoder if needed
global.TextEncoder = jest.fn().mockImplementation(() => ({
    encode: jest.fn().mockReturnValue(new Uint8Array([1, 2, 3, 4]))
}));

global.TextDecoder = jest.fn().mockImplementation(() => ({
    decode: jest.fn().mockReturnValue('mockDecryptedKey')
}));

// Mock the encryption module with password validation
jest.mock('@/lib/utils/encryption', () => ({
    encrypt: jest.fn().mockImplementation((data) => {
        console.log('encryption.encrypt called with:', data);
        return Promise.resolve('mockEncryptedData');
    }),
    decrypt: jest.fn().mockImplementation((data, password) => {
        console.log('encryption.decrypt called with password:', password);
        if (password === 'wrongpassword') {
            throw new Error('Failed to retrieve private key');
        }
        return Promise.resolve('mockDecryptedKey');
    }),
    generateSalt: jest.fn().mockReturnValue(new Uint8Array(32)),
    generateIV: jest.fn().mockReturnValue(new Uint8Array(16))
}));

// Add structuredClone to global
global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));

describe('Key Storage Flow', () => {
    beforeEach(() => {
        return (async () => {
            console.log('Setting up test...');
            // Clear the mock IndexedDB
            indexedDB = new IDBFactory();
            // Create store with proper keyPath
            const request = indexedDB.open('wallet_storage', 1);
            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('keys')) {
                    console.log('Creating keys store...');
                    // Use userId as the key directly
                    const store = db.createObjectStore('keys', { keyPath: 'id' });
                    console.log('Store created:', store);
                }
            };
            
            await new Promise<void>((resolve, reject) => {
                request.onerror = (event) => {
                    console.error('Database error:', event);
                    reject(request.error);
                };
                request.onsuccess = () => {
                    console.log('Database opened successfully');
                    resolve();
                };
            });
            
            jest.clearAllMocks();
        })();
    });

    it('should store and retrieve a private key', async () => {
        const testKey = PrivateKey.generateED25519();
        const userId = '0.0.123456';
        const password = 'testPassword123!';
        
        console.log('Storing key for account:', userId);
        await storePrivateKey(userId, testKey.toString(), password);
        
        console.log('Checking if key exists');
        const hasKey = await getStoredKey(userId);
        expect(hasKey).toBe(true);
        
        console.log('Retrieving stored key');
        const retrievedKey = await retrievePrivateKey(userId, password);
        expect(retrievedKey).toBe('mockDecryptedKey');
    });

    it('should handle missing keys gracefully', async () => {
        const nonExistentAccount = '0.0.999999';
        const hasKey = await getStoredKey(nonExistentAccount);
        expect(hasKey).toBe(false);
        
        const retrievedKey = await retrievePrivateKey(nonExistentAccount, 'password');
        expect(retrievedKey).toBeNull();
    });

    it('should prevent unauthorized access', async () => {
        const testKey = PrivateKey.generateED25519();
        const userId = '0.0.123456';
        const password = 'testPassword123!';
        
        await storePrivateKey(userId, testKey.toString(), password);
        
        await expect(retrievePrivateKey(userId, 'wrongpassword'))
            .rejects.toThrow('Failed to retrieve private key');
    });

    it('should handle encryption/decryption correctly', async () => {
        const testKey = PrivateKey.generateED25519();
        const userId = '0.0.123456';
        const password = 'testPassword123!';
        
        await storePrivateKey(userId, testKey.toString(), password);
        const retrievedKey = await retrievePrivateKey(userId, password);
        
        expect(retrievedKey).toBe('mockDecryptedKey');
    });
}); 