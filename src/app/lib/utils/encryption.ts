export async function encrypt(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await getEncryptionKey();
  
  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    encoder.encode(data)
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(encryptedData: string): Promise<string> {
  const decoder = new TextDecoder();
  const key = await getEncryptionKey();
  
  // Decode base64
  const combined = new Uint8Array(
    atob(encryptedData)
      .split('')
      .map(c => c.charCodeAt(0))
  );
  
  // Extract IV and data
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  
  // Decrypt
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    data
  );
  
  return decoder.decode(decryptedData);
}

// Helper to get or generate encryption key
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyMaterial = await getOrGenerateKeyMaterial();
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode('your-salt-here'), // Use a secure salt
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function getOrGenerateKeyMaterial(): Promise<CryptoKey> {
  // In a real app, you might want to derive this from user password/PIN
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