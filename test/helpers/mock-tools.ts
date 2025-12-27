import { Effect } from 'effect';
import type { ITool } from '../../src/domain/services/tool-registry';
import type { ToolDefinition, ToolOutput, ToolError, ToolExecutionContext } from '../../src/domain/entities/tool';
import { ToolExecutionError } from '../../src/domain/errors';

export interface MockToolConfig {
    name: string;
    description: string;
    parameters?: ToolDefinition['parameters'];
    handler: (args: Record<string, unknown>) => string | Promise<string>;
    shouldFail?: boolean;
    failureMessage?: string;
}

export function createMockTool(config: MockToolConfig): ITool {
    const definition: ToolDefinition = {
        name: config.name,
        description: config.description,
        parameters: config.parameters ?? {
            type: 'object',
            properties: {},
        },
    };

    return {
        definition,
        execute: (
            args: Record<string, unknown>,
            context: ToolExecutionContext
        ): Effect.Effect<ToolOutput, ToolError> => {
            if (config.shouldFail) {
                return Effect.fail(
                    new ToolExecutionError({
                        toolName: config.name,
                        cause: new Error(config.failureMessage ?? 'Tool execution failed'),
                    })
                );
            }

            return Effect.gen(function* () {
                const startTime = Date.now();
                const result = config.handler(args);
                const output = result instanceof Promise ? yield* Effect.promise(() => result) : result;
                return {
                    toolName: config.name,
                    output,
                    executionTimeMs: Date.now() - startTime,
                };
            });
        },
    };
}

export function createCalculatorTool(): ITool {
    return createMockTool({
        name: 'calculator',
        description: 'Perform basic arithmetic operations',
        parameters: {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    description: 'The operation to perform: add, subtract, multiply, divide',
                    enum: ['add', 'subtract', 'multiply', 'divide'],
                },
                a: { type: 'number', description: 'First operand' },
                b: { type: 'number', description: 'Second operand' },
            },
            required: ['operation', 'a', 'b'],
        },
        handler: (args) => {
            const { operation, a, b } = args as { operation: string; a: number; b: number };
            let result: number;
            switch (operation) {
                case 'add':
                    result = a + b;
                    break;
                case 'subtract':
                    result = a - b;
                    break;
                case 'multiply':
                    result = a * b;
                    break;
                case 'divide':
                    if (b === 0) return 'Error: Division by zero';
                    result = a / b;
                    break;
                default:
                    return `Error: Unknown operation ${operation}`;
            }
            return `Result: ${result}`;
        },
    });
}

export function createWeatherTool(): ITool {
    return createMockTool({
        name: 'get_weather',
        description: 'Get current weather for a location',
        parameters: {
            type: 'object',
            properties: {
                location: { type: 'string', description: 'City name or coordinates' },
            },
            required: ['location'],
        },
        handler: (args) => {
            const { location } = args as { location: string };
            return JSON.stringify({
                location,
                temperature: 72,
                unit: 'fahrenheit',
                condition: 'sunny',
                humidity: 45,
            });
        },
    });
}

export function createFailingTool(errorMessage = 'Simulated tool failure'): ITool {
    return createMockTool({
        name: 'failing_tool',
        description: 'A tool that always fails for testing error handling',
        handler: () => '',
        shouldFail: true,
        failureMessage: errorMessage,
    });
}
