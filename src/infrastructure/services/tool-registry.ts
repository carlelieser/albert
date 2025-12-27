import { Effect } from 'effect';
import type { IToolRegistry, ITool } from '../../domain/services/tool-registry';
import type { ToolDefinition } from '../../domain/entities/tool';
import { ToolNotFoundError, ToolAlreadyRegisteredError } from '../../domain/errors';

/**
 * In-memory implementation of the tool registry.
 * All methods now return Effects with typed errors.
 */
export class ToolRegistry implements IToolRegistry {
    private readonly tools = new Map<string, ITool>();

    register(tool: ITool): Effect.Effect<void, ToolAlreadyRegisteredError> {
        const name = tool.definition.name;
        if (this.tools.has(name)) {
            return Effect.fail(new ToolAlreadyRegisteredError({ toolName: name }));
        }
        this.tools.set(name, tool);
        return Effect.void;
    }

    unregister(name: string): Effect.Effect<void, ToolNotFoundError> {
        if (!this.tools.has(name)) {
            return Effect.fail(new ToolNotFoundError({ toolName: name }));
        }
        this.tools.delete(name);
        return Effect.void;
    }

    get(name: string): Effect.Effect<ITool, ToolNotFoundError> {
        const tool = this.tools.get(name);
        return tool
            ? Effect.succeed(tool)
            : Effect.fail(new ToolNotFoundError({ toolName: name }));
    }

    getAll(): ITool[] {
        return Array.from(this.tools.values());
    }

    getDefinitions(): ToolDefinition[] {
        return this.getAll().map((tool) => tool.definition);
    }

    has(name: string): boolean {
        return this.tools.has(name);
    }
}
