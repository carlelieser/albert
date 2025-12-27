import { Effect } from 'effect';
import type { ToolCall } from 'ollama';
import type { IToolExecutor, ToolExecutionCallbacks } from '../../domain/services/tool-executor';
import type { IToolRegistry } from '../../domain/services/tool-registry';
import type { ToolResult, ToolOutput } from '../../domain/entities/tool';
import type { AppServices } from '../layers';

function generateCorrelationId(): string {
    return `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class ToolExecutor implements IToolExecutor {
    constructor(private readonly toolRegistry: IToolRegistry | null) {}

    execute(
        toolCall: ToolCall,
        callbacks?: ToolExecutionCallbacks
    ): Effect.Effect<ToolResult, never, AppServices> {
        const correlationId = generateCorrelationId();
        const toolName = toolCall.function.name;
        const args = toolCall.function.arguments;
        const startTime = Date.now();

        return Effect.gen(this, function* () {
            callbacks?.onStart?.(correlationId, toolName, args);

            if (!this.toolRegistry) {
                const result: ToolResult = {
                    toolName,
                    success: false,
                    output: '',
                    error: 'No tool registry available',
                    executionTimeMs: 0,
                };
                callbacks?.onError?.(correlationId, result);
                return result;
            }

            const toolEffect = this.toolRegistry.get(toolName);
            const tool = yield* toolEffect.pipe(
                Effect.catchTag('ToolNotFoundError', (error) => {
                    const result: ToolResult = {
                        toolName,
                        success: false,
                        output: '',
                        error: error.message,
                        executionTimeMs: 0,
                    };
                    callbacks?.onError?.(correlationId, result);
                    return Effect.succeed(null);
                })
            );

            if (!tool) {
                return {
                    toolName,
                    success: false,
                    output: '',
                    error: `Tool "${toolName}" not found`,
                    executionTimeMs: 0,
                };
            }

            const context = {
                toolCall,
                correlationId,
                timestamp: new Date(),
            };

            return yield* tool.execute(args, context).pipe(
                Effect.map((output: ToolOutput): ToolResult => {
                    const result: ToolResult = {
                        toolName,
                        success: true,
                        output: output.output,
                        executionTimeMs: output.executionTimeMs,
                    };
                    callbacks?.onComplete?.(correlationId, result);
                    return result;
                }),
                Effect.catchAll((error): Effect.Effect<ToolResult> => {
                    const result: ToolResult = {
                        toolName,
                        success: false,
                        output: '',
                        error: 'message' in error ? String(error.message) : 'Unknown error',
                        executionTimeMs: Date.now() - startTime,
                    };
                    callbacks?.onError?.(correlationId, result);
                    return Effect.succeed(result);
                })
            );
        });
    }

    executeAll(
        toolCalls: ToolCall[],
        callbacks?: ToolExecutionCallbacks
    ): Effect.Effect<ToolResult[], never, AppServices> {
        return Effect.all(
            toolCalls.map((toolCall) => this.execute(toolCall, callbacks))
        );
    }
}
