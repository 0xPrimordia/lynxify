import { Buffer } from 'buffer';
import { AES, enc } from 'crypto-js';

// Encryption key derivation (we'll enhance this later)
const deriveKey = (password: string): string => {
    // In production, we should use a proper key derivation function like PBKDF2
    return password;
};

export const encrypt = async (data: string, password: string): Promise<string> => {
    try {
        const key = deriveKey(password);
        const encrypted = AES.encrypt(data, key);
        return encrypted.toString();
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

export const decrypt = async (encryptedData: string, password: string): Promise<string> => {
    try {
        const key = deriveKey(password);
        const decrypted = AES.decrypt(encryptedData, key);
        return decrypted.toString(enc.Utf8);
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}; 