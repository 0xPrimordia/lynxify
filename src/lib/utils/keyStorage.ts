import { encrypt as encryptData, decrypt as decryptData, getOrGenerateKeyMaterial } from '@/app/lib/utils/encryption';
import { openDB } from 'idb';

const DB_NAME = 'wallet_storage';
const STORE_NAME = 'keys';

// Add these new functions
export async function encrypt(data: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(data)
    );
    
    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encryptedData).length);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedData: string, password: string): Promise<string> {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);
    
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );
    
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );
    
    return new TextDecoder().decode(decrypted);
}

interface EncryptedKeyData {
    salt: number[];
    iv: number[];
    data: number[];
}

export async function storePrivateKey(userId: string, privateKey: string, password: string): Promise<void> {
    try {
        const encryptedKey = await encryptData(privateKey);
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
        
        return await decrypt(encryptedKey, password);
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

// Existing functions remain the same... 