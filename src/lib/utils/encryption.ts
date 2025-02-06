// In-memory storage for temporary key material
const keyMaterialStore = new Map<string, CryptoKey>();

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