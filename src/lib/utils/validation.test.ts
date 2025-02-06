import { z } from 'zod';
import { passwordSchema, emailSchema, userInputSchema, sanitizeInput } from './validation';

describe('Validation Utils', () => {
    describe('Password Validation', () => {
        it('should accept valid passwords', () => {
            const validPasswords = [
                'StrongP@ssw0rd123!',
                'C0mpl3x!Pass',
                'Sup3r$3cur3P@ssw0rd'
            ];

            validPasswords.forEach(password => {
                expect(() => passwordSchema.parse(password)).not.toThrow();
            });
        });

        it('should reject invalid passwords', () => {
            const invalidPasswords = [
                'short',                    // Too short
                'nouppercase123!',         // No uppercase
                'NOLOWERCASE123!',         // No lowercase
                'NoSpecialChars123',       // No special chars
                'NoNumbers@Abc!',          // No numbers
                'NO_LOWERCASE_123!'        // No lowercase
            ];

            invalidPasswords.forEach(password => {
                const result = passwordSchema.safeParse(password);
                expect(result.success).toBe(false);
            });
        });
    });

    describe('Email Validation', () => {
        it('should accept valid emails', () => {
            const validEmails = [
                'test@example.com',
                'user.name@domain.co.uk',
                'user+label@domain.com'
            ];

            validEmails.forEach(email => {
                expect(() => emailSchema.parse(email)).not.toThrow();
            });
        });

        it('should reject invalid emails', () => {
            const invalidEmails = [
                'notanemail',
                'missing@domain',
                '@nodomain.com',
                'spaces in@email.com',
                'missing.domain@'
            ];

            invalidEmails.forEach(email => {
                expect(() => emailSchema.parse(email))
                    .toThrow(z.ZodError);
            });
        });

        it('should transform emails to lowercase', () => {
            const mixedCaseEmail = 'User.Name@Domain.com';
            const result = emailSchema.parse(mixedCaseEmail);
            expect(result).toBe('user.name@domain.com');
        });
    });

    describe('User Input Validation', () => {
        it('should accept valid input', () => {
            const validInputs = [
                'Normal text',
                'Numbers 123',
                'Symbols !@#$%^&*()',
                'Unicode characters ñáéíóú'
            ];

            validInputs.forEach(input => {
                expect(() => userInputSchema.parse(input)).not.toThrow();
            });
        });

        it('should reject dangerous input', () => {
            const dangerousInputs = [
                '<script>alert("xss")</script>',
                "alert('xss')",
                '<img src="x" onerror="alert(1)">',
                `"onclick="alert('click')"`
            ];

            dangerousInputs.forEach(input => {
                expect(() => userInputSchema.parse(input))
                    .toThrow(z.ZodError);
            });
        });
    });

    describe('Input Sanitization', () => {
        it('should sanitize dangerous input', () => {
            const testCases = [
                {
                    input: '<script>alert("xss")</script>',
                    expected: 'alertxss'
                },
                {
                    input: `"onclick="alert('click')"`,
                    expected: 'onclickalertclick'
                },
                {
                    input: "   spaces   ",
                    expected: "spaces"
                }
            ];

            testCases.forEach(({ input, expected }) => {
                expect(sanitizeInput(input)).toBe(expected);
            });
        });

        it('should preserve safe characters', () => {
            const safeInput = 'Hello123!@#$%^&*';
            expect(sanitizeInput(safeInput)).toBe(safeInput);
        });
    });
}); 