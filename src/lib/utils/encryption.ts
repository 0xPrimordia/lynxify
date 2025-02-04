import { TextEncoder, TextDecoder } from 'util';

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
    
    const combined = new Uint8Array(salt.length + iv.length + new Uint8Array(encryptedData).length);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedData: string, password: string): Promise<string> {
    const combined = new Uint8Array(Array.from(atob(encryptedData)).map(c => c.charCodeAt(0)));
    
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

// Utility function for key material generation
export async function getOrGenerateKeyMaterial(): Promise<CryptoKey> {
    const key = localStorage.getItem('keyMaterial');
    if (key) {
        return crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(key),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
    }

    const newKey = crypto.getRandomValues(new Uint8Array(32));
    localStorage.setItem('keyMaterial', btoa(String.fromCharCode(...newKey)));
    
    return crypto.subtle.importKey(
        'raw',
        newKey,
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
} 