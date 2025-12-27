import { Layer, Effect, ManagedRuntime } from 'effect';
import type { Ollama } from 'ollama';
import { vi } from 'vitest';
import { PrismaService } from '../../src/infrastructure/database/prisma.effect';
import { OllamaService } from '../../src/infrastructure/services/ollama.effect';
import type { AppServices } from '../../src/infrastructure/layers';
import type { RuntimeBridge } from '../../src/infrastructure/runtime';

export function createMockOllama(): Ollama {
    return {
        chat: vi.fn().mockImplementation((options) => {
            if (options.stream) {
                return Promise.resolve({
                    async *[Symbol.asyncIterator]() {
                        yield { message: { content: 'Hello! How can I help you today?' }, done: true };
                    },
                });
            }
            if (options.format) {
                return Promise.resolve({
                    message: { content: '{"facts": [], "deleteIds": []}' },
                });
            }
            return Promise.resolve({
                message: { content: 'Hello! How can I help you today?' },
            });
        }),
        embed: vi.fn().mockImplementation(async ({ input }: { model: string; input: string | string[] }) => {
            const inputs = Array.isArray(input) ? input : [input];
            const embeddings = inputs.map(() => Array(384).fill(0.1) as number[]);
            return { embeddings };
        }),
    } as unknown as Ollama;
}

export function createTestLayer(mockOllama: Ollama = createMockOllama()): Layer.Layer<AppServices> {
    const mockPrisma = {} as any;
    return Layer.merge(
        Layer.succeed(PrismaService, mockPrisma),
        Layer.succeed(OllamaService, mockOllama)
    );
}

export function createTestRuntime(mockOllama: Ollama = createMockOllama()): RuntimeBridge<AppServices> {
    const layer = createTestLayer(mockOllama);
    const managedRuntime = ManagedRuntime.make(layer);

    return {
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
}
