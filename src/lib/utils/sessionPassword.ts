import { encrypt, decrypt, getOrGenerateKeyMaterial } from './encryption';

// Stores password temporarily in memory (not persisted)
class SessionPasswordManager {
    private static password: string | null = null;
    private static timeout: NodeJS.Timeout | null = null;
    private static readonly MAX_ATTEMPTS = 3;
    private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    private static attempts = 0;
    private static lockoutEnd: number | null = null;

    static async setPassword(password: string, expiryMinutes: number = 30) {
        try {
            if (!this.isPasswordStrong(password)) {
                throw new Error('Password does not meet security requirements');
            }

            this.password = await encrypt(password, process.env.ENCRYPTION_KEY || 'default-key');
            
            if (this.timeout) {
                clearTimeout(this.timeout);
            }
            
            this.timeout = setTimeout(() => {
                this.clearPassword();
            }, expiryMinutes * 60 * 1000);
        } catch (error) {
            throw error;
        }
    }
    
    static async getPassword(): Promise<string | null> {
        if (this.isLockedOut()) {
            const remainingTime = this.getLockoutTimeRemaining();
            throw new Error(`Account is locked out. Try again in ${remainingTime} seconds`);
        }

        try {
            if (!this.password) return null;
            
            const decrypted = await decrypt(this.password, process.env.ENCRYPTION_KEY || 'default-key');
            this.attempts = 0; // Reset attempts on success
            return decrypted;
        } catch (error) {
            this.attempts++;
            if (this.attempts >= this.MAX_ATTEMPTS) {
                this.setLockout();
                const remainingTime = this.getLockoutTimeRemaining();
                throw new Error(`Account is locked out. Try again in ${remainingTime} seconds`);
            }
            throw error;
        }
    }

    static async clearPassword() {
        this.password = null;
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }

    private static isPasswordStrong(password: string): boolean {
        // At least 12 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
        const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
        return strongPassword.test(password);
    }

    private static isLockedOut(): boolean {
        if (!this.lockoutEnd) return false;
        return Date.now() < this.lockoutEnd;
    }

    private static setLockout() {
        // Exponential backoff: 2^attempts minutes
        const lockoutMinutes = Math.min(Math.pow(2, this.attempts - this.MAX_ATTEMPTS), 60);
        this.lockoutEnd = Date.now() + (lockoutMinutes * 60 * 1000);
    }

    private static getLockoutTimeRemaining(): number {
        if (!this.lockoutEnd) return 0;
        return Math.max(0, Math.ceil((this.lockoutEnd - Date.now()) / 1000));
    }

    // Expose these for testing
    static _isPasswordStrong(password: string): boolean {
        return this.isPasswordStrong(password);
    }

    static _isLockedOut(): boolean {
        return this.isLockedOut();
    }

    static _setLockout(): void {
        this.setLockout();
    }

    static _getLockoutTimeRemaining(): number {
        return this.getLockoutTimeRemaining();
    }

    // For test cleanup
    static _resetLockout(): void {
        this.attempts = 0;
        this.lockoutEnd = null;
    }
}

export default SessionPasswordManager; 