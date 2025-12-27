import { type Effect } from 'effect';
import type {
    ToolDefinition,
    ToolResult,
    ToolExecutionContext,
    ToolOutput,
    ToolError,
} from '../entities/tool';
import type { ToolNotFoundError, ToolAlreadyRegisteredError } from '../errors';

/**
 * A tool that can be executed by the AI assistant.
 * Tools now use Effect for typed error handling.
 */
export interface ITool {
    readonly definition: ToolDefinition;

    /**
     * Execute the tool with the given arguments.
     * Returns an Effect that either succeeds with ToolOutput or fails with ToolError.
     */
    execute: (
        args: Record<string, unknown>,
        context: ToolExecutionContext
    ) => Effect.Effect<ToolOutput, ToolError>;

    /**
     * Legacy execute method for backwards compatibility.
     * @deprecated Use Effect-based execute instead
     */
    executeLegacy?: (
        args: Record<string, unknown>,
        context: ToolExecutionContext
    ) => Promise<ToolResult>;
}

/**
 * Registry for managing available tools.
 * All methods now return Effects with typed errors.
 */
export interface IToolRegistry {
    /**
     * Register a new tool.
     */
    register: (tool: ITool) => Effect.Effect<void, ToolAlreadyRegisteredError>;

    /**
     * Unregister a tool by name.
     */
    unregister: (name: string) => Effect.Effect<void, ToolNotFoundError>;

    /**
     * Get a tool by name.
     */
    get: (name: string) => Effect.Effect<ITool, ToolNotFoundError>;

    /**
     * Get all registered tools.
     */
    getAll: () => ITool[];

    /**
     * Get definitions for all registered tools.
     */
    getDefinitions: () => ToolDefinition[];

    /**
     * Check if a tool with the given name is registered.
     */
    has: (name: string) => boolean;
}
