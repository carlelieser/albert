import { Effect, Layer, ManagedRuntime, type Exit, Cause, Chunk } from 'effect';
import type { PrismaClient } from '../generated/prisma/client';
import type { Ollama } from 'ollama';
import { type AppServices, createAppLayer } from './layers';

/**
 * Configuration for the Effect runtime bridge.
 */
export interface RuntimeBridgeConfig {
    /**
     * Whether to log errors by default when running effects.
     */
    readonly logErrors?: boolean;
}

/**
 * Creates an Effect runtime bridge that provides a boundary between
 * Effect-based code and Promise-based code (like React).
 *
 * @param layer - The service layer to provide to all effects
 * @param config - Optional configuration for the bridge
 * @returns A runtime bridge with methods to execute Effects
 */
export function createRuntimeBridge<R>(
    layer: Layer.Layer<R>,
    config: RuntimeBridgeConfig = {}
) {
    const runtime = ManagedRuntime.make(layer);
    const { logErrors = true } = config;

    return {
        /**
         * The underlying ManagedRuntime.
         */
        runtime,

        /**
         * Runs an Effect and returns a Promise.
         * Rejects if the Effect fails.
         */
        runPromise: <A, E>(effect: Effect.Effect<A, E, R>): Promise<A> => {
            return runtime.runPromise(effect);
        },

        /**
         * Runs an Effect and returns a Promise of Exit.
         * Never rejects - errors are captured in the Exit.
         */
        runPromiseExit: <A, E>(effect: Effect.Effect<A, E, R>): Promise<Exit.Exit<A, E>> => {
            return runtime.runPromise(Effect.exit(effect));
        },

        /**
         * Runs an Effect synchronously.
         * Throws if the Effect is asynchronous or fails.
         */
        runSync: <A, E>(effect: Effect.Effect<A, E, R>): A => {
            return runtime.runSync(effect);
        },

        /**
         * Runs an Effect in the background (fire-and-forget).
         * Errors are logged if logErrors is true.
         */
        runFork: <A, E>(effect: Effect.Effect<A, E, R>): void => {
            const effectWithLogging = logErrors
                ? Effect.catchAllCause(effect, (cause) => {
                      if (!Cause.isEmptyType(cause)) {
                          console.error('Effect failed:', Cause.pretty(cause));
                      }
                      return Effect.void;
                  })
                : Effect.ignore(effect);

            runtime.runFork(effectWithLogging as Effect.Effect<void, never, R>);
        },

        /**
         * Runs an Effect and calls callbacks on success/failure.
         * Useful for integrating with callback-based APIs.
         */
        runCallback: <A, E>(
            effect: Effect.Effect<A, E, R>,
            options: {
                readonly onSuccess?: (value: A) => void;
                readonly onFailure?: (error: E) => void;
                readonly onDefect?: (defect: unknown) => void;
            }
        ): void => {
            const wrappedEffect = Effect.matchCauseEffect(effect, {
                onSuccess: (value) => {
                    options.onSuccess?.(value);
                    return Effect.void;
                },
                onFailure: (cause) => {
                    const failure = Cause.failureOption(cause);
                    if (failure._tag === 'Some') {
                        options.onFailure?.(failure.value);
                    } else {
                        const defects = Chunk.toArray(Cause.defects(cause));
                        if (defects.length > 0) {
                            options.onDefect?.(defects[0]);
                        }
                    }
                    return Effect.void;
                },
            });

            runtime.runFork(wrappedEffect );
        },

        /**
         * Disposes the runtime and all associated resources.
         * Should be called when the application shuts down.
         */
        dispose: (): Promise<void> => {
            return runtime.dispose();
        },
    };
}

/**
 * Type alias for the runtime bridge.
 */
export type RuntimeBridge<R> = ReturnType<typeof createRuntimeBridge<R>>;

/**
 * Creates a simple runtime bridge with no services.
 * Useful for running pure Effects.
 */
export function createSimpleRuntime(config: RuntimeBridgeConfig = {}): RuntimeBridge<never> {
    return createRuntimeBridge(Layer.empty, config);
}

/**
 * Utility to convert an Effect to a Promise for use at the React boundary.
 * This is a convenience function for one-off conversions.
 *
 * @param effect - The Effect to run
 * @returns A Promise that resolves with the Effect's result
 */
export function effectToPromise<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
    return Effect.runPromise(effect);
}

/**
 * Utility to convert an Effect to a Promise that never rejects.
 * Returns an Exit so errors can be handled explicitly.
 *
 * @param effect - The Effect to run
 * @returns A Promise that resolves with an Exit
 */
export function effectToPromiseExit<A, E>(effect: Effect.Effect<A, E>): Promise<Exit.Exit<A, E>> {
    return Effect.runPromise(Effect.exit(effect));
}

/**
 * Runs an Effect synchronously.
 * For use with pure, synchronous effects only.
 *
 * @param effect - The Effect to run
 * @returns The result of the Effect
 * @throws If the Effect is asynchronous or fails
 */
export function effectRunSync<A, E>(effect: Effect.Effect<A, E>): A {
    return Effect.runSync(effect);
}

export function createAppRuntime(
    prisma: PrismaClient,
    ollama: Ollama,
    config: RuntimeBridgeConfig = {}
): RuntimeBridge<AppServices> {
    return createRuntimeBridge(createAppLayer(prisma, ollama), config);
}
