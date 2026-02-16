/**
 * Domain Error
 * Custom error for domain-level exceptions
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'DomainError';
    
    // Maintains proper stack trace for where our error was thrown (available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DomainError);
    }
  }
}
