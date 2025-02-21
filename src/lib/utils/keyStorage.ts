import { encrypt, decrypt } from './encryption';
import { IDBPDatabase, openDB } from 'idb';

export const STORAGE_CONFIG = {
    PRIMARY_DB: 'LynxifyWallet',
    BACKUP_DB: 'LynxifyWallet_backup',
    STORE_NAME: 'secureKeys',
    VERSION: 1,
    KEY_VERIFICATION_TIMEOUT: 5000
};

export interface StoredKey {
    userId: string;
    encryptedKey: string;
    version: number;
    createdAt: number;
    lastVerified: number;
}

// Add database initialization function
export async function initializeDB(dbName: string): Promise<IDBPDatabase> {
    return openDB(dbName, STORAGE_CONFIG.VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_NAME)) {
                db.createObjectStore(STORAGE_CONFIG.STORE_NAME, { keyPath: 'userId' });
            }
        },
    });
}

// Update getStoredKey to use initialization
export async function getStoredKey(userId: string, dbName: string = STORAGE_CONFIG.PRIMARY_DB): Promise<StoredKey | null> {
    try {
        const db = await initializeDB(dbName);
        const tx = db.transaction(STORAGE_CONFIG.STORE_NAME, 'readonly');
        const store = tx.objectStore(STORAGE_CONFIG.STORE_NAME);
        const result = await store.get(userId);
        return result || null;
    } catch (error) {
        console.error('Error getting stored key:', error);
        return null;
    }
}

// Update storePrivateKey to use initialization
export async function storePrivateKey(userId: string, privateKey: string, password: string): Promise<boolean> {
    try {
        const encryptedKey = await encrypt(privateKey, password);
        const keyData: StoredKey = {
            userId,
            encryptedKey,
            version: STORAGE_CONFIG.VERSION,
            createdAt: Date.now(),
            lastVerified: Date.now()
        };

        const primaryDb = await initializeDB(STORAGE_CONFIG.PRIMARY_DB);
        const backupDb = await initializeDB(STORAGE_CONFIG.BACKUP_DB);

        await Promise.all([
            primaryDb.put(STORAGE_CONFIG.STORE_NAME, keyData),
            backupDb.put(STORAGE_CONFIG.STORE_NAME, keyData)
        ]);

        return true;
    } catch (error) {
        console.error('Error storing private key:', error);
        return false;
    }
}

export async function retrievePrivateKey(userId: string, password: string): Promise<string | null> {
    try {
        let storedKey = await getStoredKey(userId);
        
        if (!storedKey) {
            storedKey = await getStoredKey(userId, STORAGE_CONFIG.BACKUP_DB);
            if (storedKey) {
                await restoreFromBackup(userId);
            }
        }

        if (!storedKey?.encryptedKey) {
            return null;
        }

        if (storedKey.version !== STORAGE_CONFIG.VERSION) {
            await migrateKeyStorage(userId, storedKey);
        }

        return await decrypt(storedKey.encryptedKey, password);
    } catch (error) {
        throw error;
    }
}

export async function verifyKeyStorage(userId: string): Promise<boolean> {
    try {
        const primaryKey = await getStoredKey(userId, STORAGE_CONFIG.PRIMARY_DB);
        const backupKey = await getStoredKey(userId, STORAGE_CONFIG.BACKUP_DB);

        if (!primaryKey && !backupKey) {
            throw new Error('Key not found in any storage');
        }

        if (!primaryKey && backupKey) {
            // Recover from backup
            await recoverFromBackup(userId);
        }

        if (primaryKey && !backupKey) {
            // Restore backup
            await restoreBackup(userId);
        }

        return true;
    } catch (error) {
        console.error('Key verification failed:', error);
        return false;
    }
}

async function recoverFromBackup(userId: string): Promise<boolean> {
    try {
        const backupKey = await getStoredKey(userId, STORAGE_CONFIG.BACKUP_DB);
        if (!backupKey) return false;

        const primaryDb = await openDB(STORAGE_CONFIG.PRIMARY_DB, STORAGE_CONFIG.VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_NAME)) {
                    db.createObjectStore(STORAGE_CONFIG.STORE_NAME, { keyPath: 'userId' });
                }
            }
        });

        await primaryDb.put(STORAGE_CONFIG.STORE_NAME, backupKey);
        return true;
    } catch (error) {
        console.error('Recovery from backup failed:', error);
        return false;
    }
}

async function restoreBackup(userId: string): Promise<boolean> {
    try {
        const primaryKey = await getStoredKey(userId, STORAGE_CONFIG.PRIMARY_DB);
        if (!primaryKey) return false;

        const backupDb = await openDB(STORAGE_CONFIG.BACKUP_DB, STORAGE_CONFIG.VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORAGE_CONFIG.STORE_NAME)) {
                    db.createObjectStore(STORAGE_CONFIG.STORE_NAME, { keyPath: 'userId' });
                }
            }
        });

        await backupDb.put(STORAGE_CONFIG.STORE_NAME, primaryKey);
        return true;
    } catch (error) {
        console.error('Backup restoration failed:', error);
        return false;
    }
}

async function migrateKeyStorage(userId: string, oldKey: StoredKey): Promise<StoredKey> {
    const newKey: StoredKey = {
        ...oldKey,
        version: STORAGE_CONFIG.VERSION,
        lastVerified: Date.now()
    };
    
    const success = await storePrivateKey(userId, oldKey.encryptedKey, 'migration');
    if (!success) {
        throw new Error('Migration failed');
    }
    return newKey;
}

export async function restoreFromBackup(userId: string): Promise<boolean> {
    try {
        const backupKey = await getStoredKey(userId, STORAGE_CONFIG.BACKUP_DB);
        if (!backupKey) return false;

        const primaryDb = await initializeDB(STORAGE_CONFIG.PRIMARY_DB);
        await primaryDb.put(STORAGE_CONFIG.STORE_NAME, backupKey);
        return true;
    } catch (error) {
        console.error('Backup restoration failed:', error);
        return false;
    }
}

export async function attemptRecovery(userId: string): Promise<boolean> {
    try {
        // Get both keys
        const [primaryKey, backupKey] = await Promise.all([
            getStoredKey(userId, STORAGE_CONFIG.PRIMARY_DB),
            getStoredKey(userId, STORAGE_CONFIG.BACKUP_DB)
        ]);

        // If both are null, recovery failed
        if (!primaryKey && !backupKey) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Add this near other exports
export const mockForTesting = {
    getStoredKey,
    storePrivateKey,
    retrievePrivateKey
}; 