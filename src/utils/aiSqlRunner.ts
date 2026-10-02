import { pool } from '../lib/prisma.js';

const DISALLOWED_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
  'EXEC',
  'EXECUTE',
  'CREATE',
  'REPLACE',
  'MERGE',
  'CALL',
  'COPY',
  'INTO',
  'LOCK',
  'VACUUM',
  'REINDEX',
  'SET',
  'RESET',
  'PREPARE',
  'DEALLOCATE',
  'LISTEN',
  'NOTIFY',
];

const DISALLOWED_COLUMNS_AND_TABLES = [
  'passwordhash',
  'password_hash',
  'tokenhash',
  'token_hash',
  'refresh_tokens',
];

export interface SqlValidationResult {
  isValid: boolean;
  sanitizedQuery: string;
  error?: string;
}

export function validateSqlQuery(rawQuery: string): SqlValidationResult {
  let cleaned = rawQuery.trim();

  // Strip block comments /* ... */ and line comments -- ...
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, ' ');
  cleaned = cleaned.replace(/--.*$/gm, ' ');
  cleaned = cleaned.trim();

  // Strip single trailing semicolon if present
  if (cleaned.endsWith(';')) {
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Reject multiple statements (any remaining semicolon)
  if (cleaned.includes(';')) {
    return {
      isValid: false,
      sanitizedQuery: '',
      error: 'Multiple SQL statements are strictly prohibited.',
    };
  }

  // Ensure query starts with SELECT or WITH
  if (!/^(SELECT|WITH)\b/i.test(cleaned)) {
    return {
      isValid: false,
      sanitizedQuery: '',
      error: 'Only SELECT queries (including WITH expressions) are permitted.',
    };
  }

  // Check for disallowed mutating / DDL / transaction keywords
  const normalizedText = cleaned.toLowerCase();
  for (const keyword of DISALLOWED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(cleaned)) {
      return {
        isValid: false,
        sanitizedQuery: '',
        error: `Keyword "${keyword}" is not permitted. Only read-only SELECT operations are allowed.`,
      };
    }
  }

  // Check for disallowed sensitive columns or credential tables
  for (const sensitive of DISALLOWED_COLUMNS_AND_TABLES) {
    const regex = new RegExp(`\\b${sensitive}\\b`, 'i');
    if (regex.test(normalizedText)) {
      return {
        isValid: false,
        sanitizedQuery: '',
        error: `Access to sensitive credential fields or tables ("${sensitive}") is strictly restricted.`,
      };
    }
  }

  // Enforce max LIMIT 100 if query has no LIMIT clause
  if (!/\bLIMIT\b/i.test(cleaned)) {
    cleaned = `${cleaned} LIMIT 100`;
  }

  return {
    isValid: true,
    sanitizedQuery: cleaned,
  };
}

export async function executeReadOnlyQuery(
  rawQuery: string
): Promise<{ rows: Record<string, unknown>[]; queryUsed: string; rowCount: number }> {
  const validation = validateSqlQuery(rawQuery);
  if (!validation.isValid) {
    throw new Error(`Query validation rejected: ${validation.error}`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query('SET statement_timeout = 5000');

    const result = await client.query(validation.sanitizedQuery);
    await client.query('COMMIT');

    return {
      rows: result.rows as Record<string, unknown>[],
      queryUsed: validation.sanitizedQuery,
      rowCount: result.rowCount ?? result.rows.length,
    };
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback failure if connection was lost
    }
    const message = error instanceof Error ? error.message : 'Database query execution failed';
    throw new Error(`SQL execution error: ${message}`, { cause: error });
  } finally {
    client.release();
  }
}
