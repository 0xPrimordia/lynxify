import { encrypt as encryptData, decrypt as decryptData } from './encryption';
import { openDB } from 'idb';

const DB_NAME = 'wallet_storage';
const STORE_NAME = 'keys';

export async function storePrivateKey(userId: string, privateKey: string, password: string): Promise<void> {
    try {
        const encryptedKey = await encryptData(privateKey, password);
        const db = await openDB(DB_NAME, 1, {
            upgrade(db) {
                db.createObjectStore(STORE_NAME);
            }
        });
        
        await db.put(STORE_NAME, encryptedKey, userId);
    } catch (error) {
        console.error('Failed to store private key:', error);
        throw new Error('Failed to securely store private key');
    }
}

export async function retrievePrivateKey(userId: string, password: string): Promise<string | null> {
    try {
        const db = await openDB(DB_NAME, 1);
        const encryptedKey = await db.get(STORE_NAME, userId);
        
        if (!encryptedKey) return null;
        
        return await decryptData(encryptedKey, password);
    } catch (error) {
        console.error('Failed to retrieve private key:', error);
        throw new Error('Failed to retrieve private key');
    }
}

export async function getStoredKey(userId: string): Promise<boolean> {
    const db = await openDB(DB_NAME, 1);
    const key = await db.get(STORE_NAME, userId);
    return !!key;
} 