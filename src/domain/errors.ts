import { Data } from 'effect';

// ============================================================================
// Base Errors
// ============================================================================

/**
 * Base error for all domain errors.
 */
export class DomainError extends Data.TaggedError('DomainError')<{
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * Entity not found error.
 */
export class NotFoundError extends Data.TaggedError('NotFoundError')<{
    readonly entity: string;
    readonly id: string | number;
}> {
    get message(): string {
        return `${this.entity} with id ${this.id} not found`;
    }
}

/**
 * Validation error for invalid input.
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
    readonly field: string;
    readonly message: string;
    readonly value?: unknown;
}> {}

// ============================================================================
// Database Errors
// ============================================================================

/**
 * Database connection error.
 */
export class DatabaseConnectionError extends Data.TaggedError('DatabaseConnectionError')<{
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * Database query error.
 */
export class DatabaseError extends Data.TaggedError('DatabaseError')<{
    readonly operation: string;
    readonly message: string;
    readonly cause?: unknown;
}> {}

// ============================================================================
// LLM Errors
// ============================================================================

/**
 * LLM connection error.
 */
export class LLMConnectionError extends Data.TaggedError('LLMConnectionError')<{
    readonly host: string;
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * LLM chat/completion error.
 */
export class LLMError extends Data.TaggedError('LLMError')<{
    readonly model: string;
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * LLM streaming error.
 */
export class LLMStreamError extends Data.TaggedError('LLMStreamError')<{
    readonly model: string;
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * Embedding generation error.
 */
export class EmbeddingError extends Data.TaggedError('EmbeddingError')<{
    readonly model: string;
    readonly text: string;
    readonly message: string;
    readonly cause?: unknown;
}> {}

// ============================================================================
// Tool Errors
// ============================================================================

/**
 * Tool not found in registry.
 */
export class ToolNotFoundError extends Data.TaggedError('ToolNotFoundError')<{
    readonly toolName: string;
}> {
    get message(): string {
        return `Tool "${this.toolName}" not found`;
    }
}

/**
 * Tool already registered.
 */
export class ToolAlreadyRegisteredError extends Data.TaggedError('ToolAlreadyRegisteredError')<{
    readonly toolName: string;
}> {
    get message(): string {
        return `Tool "${this.toolName}" is already registered`;
    }
}

/**
 * Tool execution error.
 */
export class ToolExecutionError extends Data.TaggedError('ToolExecutionError')<{
    readonly toolName: string;
    readonly message: string;
    readonly args?: Record<string, unknown>;
    readonly executionTimeMs?: number;
    readonly cause?: unknown;
}> {}

/**
 * Tool timeout error.
 */
export class ToolTimeoutError extends Data.TaggedError('ToolTimeoutError')<{
    readonly toolName: string;
    readonly timeoutMs: number;
}> {
    get message(): string {
        return `Tool "${this.toolName}" timed out after ${this.timeoutMs}ms`;
    }
}

/**
 * Tool validation error.
 */
export class ToolValidationError extends Data.TaggedError('ToolValidationError')<{
    readonly toolName: string;
    readonly parameter: string;
    readonly message: string;
    readonly value?: unknown;
}> {}

/**
 * Dangerous command blocked.
 */
export class DangerousCommandError extends Data.TaggedError('DangerousCommandError')<{
    readonly command: string;
    readonly pattern: string;
}> {
    get message(): string {
        return `Command blocked by safety filter: ${this.pattern}`;
    }
}

// ============================================================================
// File System Errors
// ============================================================================

/**
 * File system error.
 */
export class FileSystemError extends Data.TaggedError('FileSystemError')<{
    readonly path: string;
    readonly operation: 'read' | 'write' | 'stat' | 'mkdir' | 'delete';
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * File too large error.
 */
export class FileTooLargeError extends Data.TaggedError('FileTooLargeError')<{
    readonly path: string;
    readonly size: number;
    readonly maxSize: number;
}> {
    get message(): string {
        return `File "${this.path}" is too large (${this.size} bytes, max: ${this.maxSize} bytes)`;
    }
}

// ============================================================================
// Network Errors
// ============================================================================

/**
 * Network request error.
 */
export class NetworkError extends Data.TaggedError('NetworkError')<{
    readonly url: string;
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * Invalid URL protocol error.
 */
export class UrlProtocolError extends Data.TaggedError('UrlProtocolError')<{
    readonly url: string;
    readonly protocol: string;
    readonly allowed: readonly string[];
}> {
    get message(): string {
        return `Protocol "${this.protocol}" not allowed. Allowed: ${this.allowed.join(', ')}`;
    }
}

// ============================================================================
// Knowledge Errors
// ============================================================================

/**
 * Fact not found error.
 */
export class FactNotFoundError extends Data.TaggedError('FactNotFoundError')<{
    readonly factId: number;
}> {
    get message(): string {
        return `Fact with id ${this.factId} not found`;
    }
}

/**
 * Fact storage error.
 */
export class FactStorageError extends Data.TaggedError('FactStorageError')<{
    readonly fact: string;
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * Semantic search error.
 */
export class SemanticSearchError extends Data.TaggedError('SemanticSearchError')<{
    readonly query: string;
    readonly message: string;
    readonly cause?: unknown;
}> {}

// ============================================================================
// Memory Errors
// ============================================================================

/**
 * Session not found error.
 */
export class SessionNotFoundError extends Data.TaggedError('SessionNotFoundError')<{
    readonly sessionId: string;
}> {
    get message(): string {
        return `Session "${this.sessionId}" not found`;
    }
}

/**
 * No active session error.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export class NoActiveSessionError extends Data.TaggedError('NoActiveSessionError')<{}> {
    readonly message = 'No active session';
}

/**
 * Session creation error.
 */
export class SessionCreationError extends Data.TaggedError('SessionCreationError')<{
    readonly message: string;
    readonly cause?: unknown;
}> {}

/**
 * Memory entry error.
 */
export class MemoryEntryError extends Data.TaggedError('MemoryEntryError')<{
    readonly operation: 'add' | 'get' | 'clear';
    readonly message: string;
    readonly cause?: unknown;
}> {}

// ============================================================================
// Personality Errors
// ============================================================================

/**
 * Profile not found error.
 */
export class ProfileNotFoundError extends Data.TaggedError('ProfileNotFoundError')<{
    readonly profileName: string;
}> {
    get message(): string {
        return `Profile "${this.profileName}" not found`;
    }
}

/**
 * Profile not initialized error.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export class ProfileNotInitializedError extends Data.TaggedError('ProfileNotInitializedError')<{}> {
    readonly message = 'Personality profile not initialized';
}

/**
 * Trait update error.
 */
export class TraitUpdateError extends Data.TaggedError('TraitUpdateError')<{
    readonly trait: string;
    readonly value: unknown;
    readonly message: string;
    readonly cause?: unknown;
}> {}

// ============================================================================
// Module Errors
// ============================================================================

/**
 * Module not initialized error.
 */
export class ModuleNotInitializedError extends Data.TaggedError('ModuleNotInitializedError')<{
    readonly moduleName: string;
}> {
    get message(): string {
        return `Module "${this.moduleName}" is not initialized`;
    }
}

/**
 * Module already initialized error.
 */
export class ModuleAlreadyInitializedError extends Data.TaggedError('ModuleAlreadyInitializedError')<{
    readonly moduleName: string;
}> {
    get message(): string {
        return `Module "${this.moduleName}" is already initialized`;
    }
}

// ============================================================================
// Type Exports
// ============================================================================

/**
 * Union type of all domain errors.
 */
export type AlbertError =
    | DomainError
    | NotFoundError
    | ValidationError
    | DatabaseConnectionError
    | DatabaseError
    | LLMConnectionError
    | LLMError
    | LLMStreamError
    | EmbeddingError
    | ToolNotFoundError
    | ToolAlreadyRegisteredError
    | ToolExecutionError
    | ToolTimeoutError
    | ToolValidationError
    | DangerousCommandError
    | FileSystemError
    | FileTooLargeError
    | NetworkError
    | UrlProtocolError
    | FactNotFoundError
    | FactStorageError
    | SemanticSearchError
    | SessionNotFoundError
    | NoActiveSessionError
    | SessionCreationError
    | MemoryEntryError
    | ProfileNotFoundError
    | ProfileNotInitializedError
    | TraitUpdateError
    | ModuleNotInitializedError
    | ModuleAlreadyInitializedError;
