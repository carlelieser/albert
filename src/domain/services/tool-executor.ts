import { type Effect } from 'effect';
import type { ToolCall } from 'ollama';
import type { ToolResult } from '../entities/tool';
import type { AppServices } from '../../infrastructure/layers';

export interface ToolExecutionCallbacks {
    onStart?: (correlationId: string, toolName: string, args: unknown) => void;
    onComplete?: (correlationId: string, result: ToolResult) => void;
    onError?: (correlationId: string, result: ToolResult) => void;
}

export interface IToolExecutor {
    execute(
        toolCall: ToolCall,
        callbacks?: ToolExecutionCallbacks
    ): Effect.Effect<ToolResult, never, AppServices>;

    executeAll(
        toolCalls: ToolCall[],
        callbacks?: ToolExecutionCallbacks
    ): Effect.Effect<ToolResult[], never, AppServices>;
}
