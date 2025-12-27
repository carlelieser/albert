import { Layer, Effect, ManagedRuntime } from 'effect';
import type { Ollama, ToolCall } from 'ollama';
import { vi } from 'vitest';
import { Brain } from '../../src/core/brain';
import { ExecutiveModule } from '../../src/core/modules/executive';
import { MemoryModule } from '../../src/core/modules/memory';
import { KnowledgeModule } from '../../src/core/modules/knowledge';
import { PersonalityModule } from '../../src/core/modules/personality';
import { PrismaService } from '../../src/infrastructure/database/prisma.effect';
import { OllamaService } from '../../src/infrastructure/services/ollama.effect';
import type { AppServices } from '../../src/infrastructure/layers';
import type { RuntimeBridge } from '../../src/infrastructure/runtime';
import { EventCapture } from './event-capture';
import { TestInput, TestOutput } from './test-io';
import {
    createMockMemoryRepository,
    createMockMemoryState,
    createMockKnowledgeRepository,
    createMockKnowledgeState,
    createMockPersonalityRepository,
    createMockPersonalityState,
    type MockMemoryState,
    type MockKnowledgeState,
    type MockPersonalityState,
} from './mock-repositories';
import { ToolRegistry } from '../../src/infrastructure/services/tool-registry';
import type { ITool, IToolRegistry } from '../../src/domain/services/tool-registry';

export interface MockOllamaConfig {
    defaultResponse?: string;
    streamingResponse?: string;
    toolCalls?: ToolCall[];
    factExtractionResponse?: { facts: Array<{ content: string; confidence: number }>; deleteIds: string[] };
}

export function createConfigurableMockOllama(config: MockOllamaConfig = {}): Ollama {
    const defaultResponse = config.defaultResponse ?? 'Hello! How can I help you today?';
    const streamingResponse = config.streamingResponse ?? defaultResponse;
    const factResponse = config.factExtractionResponse ?? { facts: [], deleteIds: [] };
    const toolCalls = config.toolCalls;
    let toolCallMade = false;

    return {
        chat: vi.fn().mockImplementation((options) => {
            if (options.stream) {
                return Promise.resolve({
                    async *[Symbol.asyncIterator]() {
                        yield { message: { content: streamingResponse }, done: true };
                    },
                });
            }
            if (options.format) {
                return Promise.resolve({
                    message: { content: JSON.stringify(factResponse) },
                });
            }
            if (options.tools && options.tools.length > 0 && toolCalls && !toolCallMade) {
                toolCallMade = true;
                return Promise.resolve({
                    message: { content: '', tool_calls: toolCalls },
                });
            }
            return Promise.resolve({
                message: { content: defaultResponse },
            });
        }),
        embed: vi.fn().mockImplementation(async ({ input }: { model: string; input: string | string[] }) => {
            const inputs = Array.isArray(input) ? input : [input];
            const embeddings = inputs.map(() => Array(384).fill(0.1) as number[]);
            return { embeddings };
        }),
    } as unknown as Ollama;
}

export interface MockStates {
    memory: MockMemoryState;
    knowledge: MockKnowledgeState;
    personality: MockPersonalityState;
}

export interface IntegrationHarness {
    brain: Brain;
    input: TestInput;
    output: TestOutput;
    capture: EventCapture;
    mockOllama: Ollama;
    mockStates: MockStates;
    toolRegistry: IToolRegistry;
    cleanup: () => Promise<void>;
}

export interface HarnessConfig {
    ollamaConfig?: MockOllamaConfig;
    tools?: ITool[];
}

export async function createIntegrationHarness(config: HarnessConfig = {}): Promise<IntegrationHarness> {
    const brain = new Brain();
    const mockOllama = createConfigurableMockOllama(config.ollamaConfig);

    const memoryState = createMockMemoryState();
    const knowledgeState = createMockKnowledgeState();
    const personalityState = createMockPersonalityState();

    const memoryRepo = createMockMemoryRepository(memoryState);
    const knowledgeRepo = createMockKnowledgeRepository(knowledgeState);
    const personalityRepo = createMockPersonalityRepository(personalityState);

    const toolRegistry = new ToolRegistry();
    if (config.tools) {
        for (const tool of config.tools) {
            Effect.runSync(toolRegistry.register(tool));
        }
    }

    const mockPrisma = {} as any;

    const layer = Layer.merge(
        Layer.succeed(PrismaService, mockPrisma),
        Layer.succeed(OllamaService, mockOllama)
    );

    const managedRuntime = ManagedRuntime.make(layer);

    const runtime: RuntimeBridge<AppServices> = {
        runtime: managedRuntime,
        runPromise: <A, E>(effect: Effect.Effect<A, E, AppServices>): Promise<A> => {
            return managedRuntime.runPromise(effect);
        },
        runPromiseExit: <A, E>(effect: Effect.Effect<A, E, AppServices>) => {
            return managedRuntime.runPromise(Effect.exit(effect));
        },
        runSync: <A, E>(effect: Effect.Effect<A, E, AppServices>): A => {
            return managedRuntime.runSync(effect);
        },
        runFork: <A, E>(effect: Effect.Effect<A, E, AppServices>): void => {
            managedRuntime.runFork(Effect.ignore(effect));
        },
        runCallback: () => {},
        dispose: () => managedRuntime.dispose(),
    };

    brain.setRuntime(runtime);

    const memoryModule = new MemoryModule(memoryRepo);
    const knowledgeModule = new KnowledgeModule(knowledgeRepo);
    const personalityModule = new PersonalityModule(personalityRepo);
    const executiveModule = new ExecutiveModule(undefined, toolRegistry);

    brain.registerModule(memoryModule);
    brain.registerModule(knowledgeModule);
    brain.registerModule(personalityModule);
    brain.registerModule(executiveModule);

    const input = new TestInput();
    const output = new TestOutput();
    brain.registerInput(input);
    brain.registerOutput(output);

    const capture = new EventCapture(brain);

    await brain.awake();

    return {
        brain,
        input,
        output,
        capture,
        mockOllama,
        toolRegistry,
        mockStates: {
            memory: memoryState,
            knowledge: knowledgeState,
            personality: personalityState,
        },
        cleanup: async () => {
            capture.dispose();
            await brain.sleep();
            await runtime.dispose();
        },
    };
}
