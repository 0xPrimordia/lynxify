import { z } from 'zod';

export const passwordSchema = z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const emailSchema = z.string()
    .email('Invalid email address')
    .transform(email => email.toLowerCase());

export const userInputSchema = z.string()
    .trim()
    .min(1, 'Input cannot be empty')
    .regex(/^[^<>'"]*$/, 'Invalid characters detected');

export function sanitizeInput(input: string): string {
    return input
        .replace(/<[^>]*>|script/gi, '')  // Remove HTML tags and 'script' text
        .replace(/["']/g, '')             // Remove quotes
        .replace(/[()=]/g, '')            // Remove parentheses and equals
        .replace(/\s+/g, ' ')             // Normalize whitespace
        .trim();
}

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