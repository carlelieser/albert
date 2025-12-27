import type { Tool as OllamaTool, ToolCall } from 'ollama';
import type { ToolExecutionError, ToolTimeoutError, ToolValidationError } from '../errors';

export interface ToolParameter {
    type: string | string[];
    description?: string;
    enum?: unknown[];
}

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, ToolParameter>;
        required?: string[];
    };
}

/**
 * Result of a successful tool execution.
 * Note: With Effect, failures are represented in the error channel,
 * so we only need the success case here.
 */
export interface ToolOutput {
    readonly toolName: string;
    readonly output: string;
    readonly executionTimeMs: number;
}

/**
 * Legacy ToolResult for backwards compatibility during migration.
 * @deprecated Use Effect-based tool execution instead
 */
export interface ToolResult {
    toolName: string;
    success: boolean;
    output: string;
    error?: string;
    executionTimeMs: number;
}

export interface ToolExecutionContext {
    toolCall: ToolCall;
    correlationId: string;
    timestamp: Date;
}

/**
 * Union of all possible tool execution errors.
 */
export type ToolError = ToolExecutionError | ToolTimeoutError | ToolValidationError;

/**
 * Converts a ToolDefinition to Ollama's Tool format for API calls.
 */
export function toOllamaTool(definition: ToolDefinition): OllamaTool {
    return {
        type: 'function',
        function: {
            name: definition.name,
            description: definition.description,
            parameters: definition.parameters,
        },
    };
}

