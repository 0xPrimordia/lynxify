import { 
    sqlIdentifierSchema, 
    sqlValueSchema, 
    sanitizeSqlIdentifier, 
    sanitizeSqlValue,
    createParameterizedQuery 
} from './sqlSanitization';
import { z } from 'zod';

describe('SQL Sanitization', () => {
    describe('SQL Identifier Validation', () => {
        it('should accept valid identifiers', () => {
            const validIdentifiers = [
                'users',
                'user_accounts',
                'table_123',
                '_hidden_table'
            ];

            validIdentifiers.forEach(identifier => {
                expect(() => sqlIdentifierSchema.parse(identifier)).not.toThrow();
            });
        });

        it('should reject invalid identifiers', () => {
            const invalidIdentifiers = [
                '123table',      // Starts with number
                'user-table',    // Contains hyphen
                'table.name',    // Contains period
                'drop;',         // Contains semicolon
                'a'.repeat(64)   // Too long
            ];

            invalidIdentifiers.forEach(identifier => {
                expect(() => sqlIdentifierSchema.parse(identifier))
                    .toThrow(z.ZodError);
            });
        });
    });

    describe('SQL Value Sanitization', () => {
        it('should escape single quotes', () => {
            const testCases = [
                {
                    input: "O'Reilly",
                    expected: "O''Reilly"
                },
                {
                    input: "User's data",
                    expected: "User''s data"
                }
            ];

            testCases.forEach(({ input, expected }) => {
                expect(sqlValueSchema.parse(input)).toBe(expected);
            });
        });

        it('should trim whitespace', () => {
            expect(sqlValueSchema.parse('  test  ')).toBe('test');
        });
    });

    describe('Parameterized Query Creation', () => {
        it('should create valid parameterized queries', () => {
            const query = 'SELECT * FROM users WHERE name = ${name} AND age = ${age}';
            const params = { name: 'John', age: 25 };

            const result = createParameterizedQuery(query, params);

            expect(result).toEqual({
                text: 'SELECT * FROM users WHERE name = $1 AND age = $2',
                values: ['John', 25]
            });
        });

        it('should throw on missing parameters', () => {
            const query = 'SELECT * FROM users WHERE name = ${name}';
            const params = {};

            expect(() => createParameterizedQuery(query, params))
                .toThrow('Missing parameter: name');
        });

        it('should handle multiple occurrences of the same parameter', () => {
            const query = 'SELECT * FROM users WHERE name = ${name} OR nickname = ${name}';
            const params = { name: 'John' };

            const result = createParameterizedQuery(query, params);

            expect(result).toEqual({
                text: 'SELECT * FROM users WHERE name = $1 OR nickname = $2',
                values: ['John', 'John']
            });
        });
    });
}); 