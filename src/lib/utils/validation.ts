export function validatePassword(password: string): { isValid: boolean; error?: string } {
    if (!password) {
        return { isValid: false, error: 'Password is required' };
    }
    if (password.length < 8) {
        return { isValid: false, error: 'Password must be at least 8 characters' };
    }
    // Add more password requirements as needed
    return { isValid: true };
} 