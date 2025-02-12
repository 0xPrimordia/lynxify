import { Buffer } from 'buffer';

// In-memory storage for temporary key material
const keyMaterialStore = new Map<string, CryptoKey>();

async function generateKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

export async function encrypt(data: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await generateKey(password, salt);
    
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(data)
    );

    // Combine salt + iv + encrypted data
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return Buffer.from(result).toString('base64');
}

export async function decrypt(encryptedData: string, password: string): Promise<string> {
    console.log('Starting decryption with data length:', encryptedData.length);
    const data = Buffer.from(encryptedData, 'base64');
    console.log('Decoded buffer length:', data.length);
    
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const encrypted = data.slice(28);
    
    console.log('Extracted parts:', {
        saltLength: salt.length,
        ivLength: iv.length,
        encryptedLength: encrypted.length
    });
    
    const key = await generateKey(password, salt);
    console.log('Generated key successfully');
    
    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encrypted
        );
        console.log('Decryption successful, result length:', decrypted.byteLength);
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw error;
    }
}

export async function getOrGenerateKeyMaterial(salt: Uint8Array): Promise<CryptoKey> {
    const keyId = Array.from(salt).join(',');
    
    // Check in-memory store first
    const existingKey = keyMaterialStore.get(keyId);
    if (existingKey) {
        return existingKey;
    }

    // Generate new key material if none exists
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(process.env.NEXT_PUBLIC_ENCRYPTION_KEY),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    // Store in memory
    keyMaterialStore.set(keyId, keyMaterial);
    return keyMaterial;
}

export async function getEncryptionKey(salt: Uint8Array, password: string): Promise<CryptoKey> {
    const keyMaterial = await getOrGenerateKeyMaterial(salt);
    
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
} 