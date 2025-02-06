import { z } from 'zod';

// Schema for SQL identifiers (table names, column names)
export const sqlIdentifierSchema = z.string()
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Invalid SQL identifier')
    .max(63, 'Identifier too long');

// Schema for SQL values
export const sqlValueSchema = z.string()
    .transform(value => value.replace(/'/g, "''")) // Escape single quotes
    .transform(value => value.trim());

export function sanitizeSqlIdentifier(identifier: string): string {
    return sqlIdentifierSchema.parse(identifier);
}

export function sanitizeSqlValue(value: string): string {
    return sqlValueSchema.parse(value);
}

export function createParameterizedQuery(
    query: string,
    params: Record<string, string | number>
): { text: string; values: any[] } {
    const values: any[] = [];
    const text = query.replace(/\$\{([^}]+)\}/g, (_, key) => {
        if (!(key in params)) {
            throw new Error(`Missing parameter: ${key}`);
        }
        values.push(params[key]);
        return `$${values.length}`;
    });
    
    return { text, values };
} 