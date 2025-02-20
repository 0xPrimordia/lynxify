import { storePrivateKey, retrievePrivateKey, getStoredKey, STORAGE_CONFIG, initializeDB, StoredKey, mockForTesting } from './keyStorage';
import { PrivateKey } from "@hashgraph/sdk";
import 'fake-indexeddb/auto';  // This will automatically mock IndexedDB
import { encrypt, decrypt } from './encryption';
import { openDB } from 'idb';
import { attemptRecovery } from './keyStorage';

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
jest.mock('./encryption');

// Add structuredClone to global
global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));

describe('Key Storage System', () => {
    const mockUserId = 'test-user-123';
    const mockPrivateKey = 'mock-private-key';
    const mockPassword = 'test-password';
    const mockEncryptedKey = 'encrypted-key-data';

    beforeEach(async () => {
        // Clear both DBs before each test
        await Promise.all([
            indexedDB.deleteDatabase(STORAGE_CONFIG.PRIMARY_DB),
            indexedDB.deleteDatabase(STORAGE_CONFIG.BACKUP_DB)
        ]);
        
        // Initialize both DBs
        await Promise.all([
            initializeDB(STORAGE_CONFIG.PRIMARY_DB),
            initializeDB(STORAGE_CONFIG.BACKUP_DB)
        ]);
        
        // Reset all mocks
        jest.clearAllMocks();
        (encrypt as jest.Mock).mockResolvedValue(mockEncryptedKey);
        (decrypt as jest.Mock).mockResolvedValue(mockPrivateKey);
        
        // Add proper mock for storePrivateKey
        jest.spyOn(mockForTesting, 'storePrivateKey').mockImplementation(() => Promise.resolve(true));

        // Mock the storage functions
        jest.spyOn(mockForTesting, 'getStoredKey');
        jest.spyOn(mockForTesting, 'retrievePrivateKey');
    });

    describe('Primary Storage Operations', () => {
        it('should store and retrieve a private key', async () => {
            const stored = await storePrivateKey(mockUserId, mockPrivateKey, mockPassword);
            expect(stored).toBe(true);

            const retrieved = await retrievePrivateKey(mockUserId, mockPassword);
            expect(retrieved).toBe(mockPrivateKey);
        });

        it('should handle missing keys gracefully', async () => {
            const result = await retrievePrivateKey('nonexistent-user', mockPassword);
            expect(result).toBeNull();
        });

        it('should prevent unauthorized access', async () => {
            await storePrivateKey(mockUserId, mockPrivateKey, mockPassword);
            (decrypt as jest.Mock).mockRejectedValue(new Error('Decryption failed'));
            
            await expect(retrievePrivateKey(mockUserId, 'wrong-password'))
                .rejects.toThrow('Decryption failed');
        });
    });

    describe('Backup and Recovery', () => {
        it('should store key in both primary and backup', async () => {
            await storePrivateKey(mockUserId, mockPrivateKey, mockPassword);
            
            const primaryKey = await getStoredKey(mockUserId, STORAGE_CONFIG.PRIMARY_DB);
            const backupKey = await getStoredKey(mockUserId, STORAGE_CONFIG.BACKUP_DB);
            
            expect(primaryKey?.encryptedKey).toBe(mockEncryptedKey);
            expect(backupKey?.encryptedKey).toBe(mockEncryptedKey);
        });

        it('should recover from backup if primary fails', async () => {
            await storePrivateKey(mockUserId, mockPrivateKey, mockPassword);
            await indexedDB.deleteDatabase(STORAGE_CONFIG.PRIMARY_DB);
            
            const retrieved = await retrievePrivateKey(mockUserId, mockPassword);
            expect(retrieved).toBe(mockPrivateKey);
        });
    });

    describe('Storage Metadata', () => {
        it('should include proper metadata in stored key', async () => {
            await storePrivateKey(mockUserId, mockPrivateKey, mockPassword);
            const storedKey = await getStoredKey(mockUserId);
            
            expect(storedKey).toMatchObject({
                userId: mockUserId,
                encryptedKey: mockEncryptedKey,
                createdAt: expect.any(Number),
                lastVerified: expect.any(Number)
            });
        });
    });

    describe('Version Management', () => {
        it('should handle version mismatch and migrate keys', async () => {
            // Store key with old version
            const oldVersionKey = {
                userId: mockUserId,
                encryptedKey: mockEncryptedKey,
                version: STORAGE_CONFIG.VERSION - 1,
                createdAt: Date.now(),
                lastVerified: Date.now()
            };
            
            const db = await openDB(STORAGE_CONFIG.PRIMARY_DB, STORAGE_CONFIG.VERSION);
            await db.put(STORAGE_CONFIG.STORE_NAME, oldVersionKey);
            
            // Attempt to retrieve should trigger migration
            const result = await retrievePrivateKey(mockUserId, mockPassword);
            
            // Verify migration
            const migratedKey = await getStoredKey(mockUserId);
            expect(migratedKey).not.toBeNull();
            expect(migratedKey!.version).toBe(STORAGE_CONFIG.VERSION);
            expect(result).toBe(mockPrivateKey);
        });

        it('should handle failed migrations gracefully', async () => {
            console.log('Starting failed migration test');
            // Mock storePrivateKey to fail
            (encrypt as jest.Mock).mockRejectedValueOnce(new Error('Migration failed'));
            
            // Store key with old version
            const oldVersionKey = {
                userId: mockUserId,
                encryptedKey: mockEncryptedKey,
                version: STORAGE_CONFIG.VERSION - 1,
                createdAt: Date.now(),
                lastVerified: Date.now()
            };
            console.log('Storing old version key:', oldVersionKey);
            
            const db = await openDB(STORAGE_CONFIG.PRIMARY_DB, STORAGE_CONFIG.VERSION);
            await db.put(STORAGE_CONFIG.STORE_NAME, oldVersionKey);
            
            await expect(retrievePrivateKey(mockUserId, mockPassword))
                .rejects.toThrow('Migration failed');
        });
    });

    describe('Complete Storage Failure Recovery', () => {
        it('should attempt backup recovery when primary fails', async () => {
            // Setup: Store in backup only
            const keyData: StoredKey = {
                userId: mockUserId,
                encryptedKey: mockEncryptedKey,
                version: STORAGE_CONFIG.VERSION,
                createdAt: Date.now(),
                lastVerified: Date.now()
            };
            
            // Delete primary but keep backup
            await indexedDB.deleteDatabase(STORAGE_CONFIG.PRIMARY_DB);
            const backupDb = await initializeDB(STORAGE_CONFIG.BACKUP_DB);
            await backupDb.put(STORAGE_CONFIG.STORE_NAME, keyData);
            
            const result = await attemptRecovery(mockUserId);
            expect(result).toBe(true);
            
            // Verify backup was checked
            const primaryKey = await getStoredKey(mockUserId, STORAGE_CONFIG.PRIMARY_DB);
            expect(primaryKey).not.toBeNull();
        });
    });
}); 