import { encrypt, decrypt } from './encryption';
import { openDB } from 'idb';

const DB_NAME = 'wallet_storage';
const STORE_NAME = 'keys';

export async function storePrivateKey(userId: string, privateKey: string, password: string): Promise<void> {
    const encryptedKey = await encrypt(privateKey, password);
    const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
            db.createObjectStore(STORE_NAME);
        }
    });
    
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.put({ id: userId, key: encryptedKey });
}

export async function retrievePrivateKey(userId: string, password: string): Promise<string | null> {
    const db = await openDB(DB_NAME, 1);
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const data = await store.get(userId);
    
    if (!data?.key) return null;
    
    return decrypt(data.key, password);
}

export async function getStoredKey(userId: string): Promise<boolean> {
    const db = await openDB(DB_NAME, 1);
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const key = await store.get(userId);
    return !!key;
} 