import SessionPasswordManager from './sessionPassword';

// Mock the encryption module
jest.mock('@/lib/utils/encryption', () => ({
    encrypt: jest.fn().mockImplementation(async (text) => text),
    decrypt: jest.fn().mockImplementation(async (text) => text),
    getOrGenerateKeyMaterial: jest.fn().mockResolvedValue('mock-key-material')
}));

describe('SessionPasswordManager', () => {
    beforeEach(() => {
        // Reset the password manager state
        SessionPasswordManager.clearPassword();
        SessionPasswordManager._resetLockout();  // Reset lockout state
        jest.useFakeTimers();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Password Validation', () => {
        it('should reject weak passwords', async () => {
            const weakPasswords = [
                'short',                 // Too short
                'nouppercaseor123!',    // No uppercase
                'NOLOWERCASEOR123!',    // No lowercase
                'NoSpecialChars123',    // No special chars
                'NoNumbers!'            // No numbers
            ];

            for (const password of weakPasswords) {
                await expect(SessionPasswordManager.setPassword(password))
                    .rejects
                    .toThrow('Password does not meet security requirements');
            }
        });

        it('should accept strong passwords', async () => {
            const strongPassword = 'StrongP@ssw0rd123!';
            await expect(SessionPasswordManager.setPassword(strongPassword))
                .resolves
                .not.toThrow();
        });
    });

    describe('Password Expiry', () => {
        it('should expire password after specified time', async () => {
            const password = 'StrongP@ssw0rd123!';
            await SessionPasswordManager.setPassword(password, 1); // 1 minute expiry
            
            const storedPassword = await SessionPasswordManager.getPassword();
            expect(storedPassword).toBe(password);
            
            // Advance time by 61 seconds (past expiry)
            jest.advanceTimersByTime(61 * 1000);
            
            const expiredPassword = await SessionPasswordManager.getPassword();
            expect(expiredPassword).toBeNull();
        });

        it('should clear timeout on manual clear', async () => {
            const password = 'StrongP@ssw0rd123!';
            await SessionPasswordManager.setPassword(password);
            
            expect(await SessionPasswordManager.getPassword()).toBe(password);
            
            await SessionPasswordManager.clearPassword();
            
            // Advance time
            jest.advanceTimersByTime(5000);
            
            expect(await SessionPasswordManager.getPassword()).toBeNull();
        });
    });

    describe('Lockout Functionality', () => {
        it('should implement lockout after max attempts', async () => {
            const password = 'StrongP@ssw0rd123!';
            await SessionPasswordManager.setPassword(password);

            // Mock decrypt to simulate failed attempts
            const { decrypt } = require('@/lib/utils/encryption');
            decrypt.mockImplementation(() => {
                throw new Error('Invalid password');
            });

            // Make MAX_ATTEMPTS failed attempts
            for (let i = 0; i < 2; i++) {  // Only do 2 attempts, as the 3rd will trigger lockout
                await expect(SessionPasswordManager.getPassword()).rejects.toThrow('Invalid password');
            }

            // The third attempt should trigger lockout
            const lockoutError = await SessionPasswordManager.getPassword().catch(e => e);
            expect(lockoutError.message).toMatch(/locked out/i);
            expect(lockoutError.message).toMatch(/Try again in \d+ seconds/);
        });

        it('should implement exponential backoff', async () => {
            const password = 'StrongP@ssw0rd123!';
            await SessionPasswordManager.setPassword(password);

            const { decrypt } = require('@/lib/utils/encryption');
            decrypt.mockImplementation(() => {
                throw new Error('Invalid password');
            });

            // First set of failures (3 attempts to trigger lockout)
            for (let i = 0; i < 3; i++) {
                await SessionPasswordManager.getPassword().catch(() => {});
            }
            const firstLockout = await SessionPasswordManager.getPassword().catch(e => e.message);
            const firstDuration = parseInt(firstLockout.match(/\d+/)[0]);

            // Wait for lockout to expire
            jest.advanceTimersByTime((firstDuration + 1) * 1000);

            // Second set of failures (3 more attempts)
            for (let i = 0; i < 3; i++) {
                await SessionPasswordManager.getPassword().catch(() => {});
            }
            const secondLockout = await SessionPasswordManager.getPassword().catch(e => e.message);
            const secondDuration = parseInt(secondLockout.match(/\d+/)[0]);

            // With exponential backoff (2^attempts), second duration should be longer
            expect(secondDuration).toBeGreaterThan(firstDuration);
        });
    });
}); 