import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createIntegrationHarness, type IntegrationHarness } from '../helpers/integration-harness';
import { Events } from '../../src/core/events';
import { createCalculatorTool, createWeatherTool, createFailingTool } from '../helpers/mock-tools';

describe('Tool Execution Loop', () => {
    let harness: IntegrationHarness;

    afterEach(async () => {
        if (harness) {
            await harness.cleanup();
        }
    });

    describe('Tool Registration', () => {
        it('should register tools with the harness', async () => {
            const calculator = createCalculatorTool();
            const weather = createWeatherTool();

            harness = await createIntegrationHarness({
                tools: [calculator, weather],
            });

            expect(harness.toolRegistry.has('calculator')).toBe(true);
            expect(harness.toolRegistry.has('get_weather')).toBe(true);
        });

        it('should list tool definitions', async () => {
            const calculator = createCalculatorTool();

            harness = await createIntegrationHarness({
                tools: [calculator],
            });

            const definitions = harness.toolRegistry.getDefinitions();
            expect(definitions).toHaveLength(1);
            expect(definitions[0].name).toBe('calculator');
        });
    });

    describe('Tool Execution Flow', () => {
        it('should execute tool when LLM requests it', async () => {
            const calculator = createCalculatorTool();

            harness = await createIntegrationHarness({
                tools: [calculator],
                ollamaConfig: {
                    toolCalls: [
                        {
                            function: {
                                name: 'calculator',
                                arguments: { operation: 'add', a: 2, b: 3 },
                            },
                        },
                    ],
                    defaultResponse: 'The result is 5.',
                },
            });

            harness.input.send('What is 2 + 3?');

            await harness.output.waitForResponse(10000);

            harness.capture.expectFired(Events.ToolExecutionStart, 'Tool execution should start');
            harness.capture.expectFired(Events.ToolExecutionComplete, 'Tool execution should complete');
        });

        it('should emit correct tool execution events', async () => {
            const calculator = createCalculatorTool();

            harness = await createIntegrationHarness({
                tools: [calculator],
                ollamaConfig: {
                    toolCalls: [
                        {
                            function: {
                                name: 'calculator',
                                arguments: { operation: 'multiply', a: 4, b: 5 },
                            },
                        },
                    ],
                    defaultResponse: 'The result is 20.',
                },
            });

            harness.input.send('What is 4 times 5?');

            await harness.output.waitForResponse(10000);

            const startEvent = harness.capture.getAll()
                .find(e => e.event === Events.ToolExecutionStart);
            
            expect(startEvent).toBeDefined();
            expect((startEvent?.data as any).toolName).toBe('calculator');

            const completeEvent = harness.capture.getAll()
                .find(e => e.event === Events.ToolExecutionComplete);
            
            expect(completeEvent).toBeDefined();
        });

        it('should handle tool execution errors gracefully', async () => {
            const failingTool = createFailingTool('Simulated failure');

            harness = await createIntegrationHarness({
                tools: [failingTool],
                ollamaConfig: {
                    toolCalls: [
                        {
                            function: {
                                name: 'failing_tool',
                                arguments: {},
                            },
                        },
                    ],
                    defaultResponse: 'I encountered an error.',
                },
            });

            harness.input.send('Use the failing tool');

            await harness.output.waitForResponse(10000);

            harness.capture.expectFired(Events.ToolExecutionStart);
            harness.capture.expectFired(Events.ToolExecutionError, 'Tool error should be reported');
        });

        it('should continue to response after tool execution', async () => {
            const weather = createWeatherTool();

            harness = await createIntegrationHarness({
                tools: [weather],
                ollamaConfig: {
                    toolCalls: [
                        {
                            function: {
                                name: 'get_weather',
                                arguments: { location: 'New York' },
                            },
                        },
                    ],
                    defaultResponse: 'The weather in New York is sunny with 72°F.',
                    streamingResponse: 'The weather in New York is sunny with 72°F.',
                },
            });

            harness.input.send("What's the weather in New York?");

            const response = await harness.output.waitForResponse(10000);

            expect(response).toContain('New York');
            harness.capture.expectFired(Events.OutputReady);
        });
    });

    describe('No Tool Requests', () => {
        it('should not emit tool events when no tools requested', async () => {
            const calculator = createCalculatorTool();

            harness = await createIntegrationHarness({
                tools: [calculator],
                ollamaConfig: {
                    defaultResponse: 'Hello! I can help with calculations.',
                },
            });

            harness.input.send('Hello');

            await harness.output.waitForResponse(10000);

            const toolEvents = harness.capture.getAll()
                .filter(e => e.event === Events.ToolExecutionStart);
            
            expect(toolEvents).toHaveLength(0);
        });

        it('should complete normally without tools', async () => {
            harness = await createIntegrationHarness({
                ollamaConfig: {
                    defaultResponse: 'No tools needed here.',
                },
            });

            harness.input.send('Just say hello');

            const response = await harness.output.waitForResponse(10000);

            expect(response).toBe('No tools needed here.');
            harness.capture.expectFired(Events.OutputReady);
        });
    });
});
