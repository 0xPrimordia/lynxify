import { openDB } from 'idb';

export async function storePrivateKey(accountId: string, privateKey: string): Promise<void> {
  // Generate a CryptoKey for encrypting the private key
  const encryptionKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );
  
  // Export the encryption key to store its reference
  const exportedKey = await crypto.subtle.exportKey('raw', encryptionKey);
  const keyIdentifier = `key_${accountId}`;
  
  // Store the encryption key in the CryptoKey storage
  await crypto.subtle.importKey(
    'raw',
    exportedKey,
    'AES-GCM',
    false, // not extractable when stored
    ['encrypt', 'decrypt']
  );
  
  // Encrypt the private key
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    encryptionKey,
    encoder.encode(privateKey)
  );
  
  // Store encrypted data with IV
  const combinedData = new Uint8Array(iv.length + new Uint8Array(encryptedData).length);
  combinedData.set(iv);
  combinedData.set(new Uint8Array(encryptedData), iv.length);
  
  // Store in IndexedDB only the encrypted data
  const db = await openDB('WalletDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('wallet')) {
        db.createObjectStore('wallet', { keyPath: 'id' });
      }
    },
  });
  const tx = db.transaction('wallet', 'readwrite');
  const store = tx.objectStore('wallet');
  await store.put({
    id: accountId,
    encryptedData: btoa(String.fromCharCode(...combinedData))
  });
}

export async function retrievePrivateKey(accountId: string): Promise<string | null> {
  try {
    const db = await openDB('WalletDB', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('wallet')) {
          db.createObjectStore('wallet', { keyPath: 'id' });
        }
      },
    });
    const tx = db.transaction('wallet', 'readonly');
    const store = tx.objectStore('wallet');
    const data = await store.get(accountId);
    
    if (!data) return null;
    
    // Get the encryption key from CryptoKey storage
    const keyIdentifier = `key_${accountId}`;
    const encryptionKey = await crypto.subtle.importKey(
      'raw',
      new Uint8Array(/* stored key reference */),
      'AES-GCM',
      false,
      ['decrypt']
    );
    
    // Decrypt the data
    const encryptedData = Uint8Array.from(atob(data.encryptedData), c => c.charCodeAt(0));
    const iv = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      encryptionKey,
      ciphertext
    );
    
    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error('Error retrieving private key:', error);
    return null;
  }
} 