import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { Effect, type Exit } from 'effect';
import { createRuntimeBridge, type RuntimeBridge } from '../../infrastructure/runtime';
import { PrismaLive, type PrismaService } from '../../infrastructure/database/prisma.effect';
import { OllamaLive, type OllamaService } from '../../infrastructure/services/ollama.effect';
import type { PrismaClient } from '../../generated/prisma/client';
import type { Ollama } from 'ollama';
import { Layer } from 'effect';

/**
 * Combined service requirements for the Effect runtime.
 */
export type AppServices = PrismaService | OllamaService;

/**
 * Context value provided to React components.
 */
interface EffectContextValue {
    /**
     * Runs an Effect and returns a Promise.
     * Rejects if the Effect fails.
     */
    runEffect: <A, E>(effect: Effect.Effect<A, E, AppServices>) => Promise<A>;

    /**
     * Runs an Effect and returns a Promise of Exit.
     * Never rejects - errors are captured in the Exit.
     */
    runEffectExit: <A, E>(effect: Effect.Effect<A, E, AppServices>) => Promise<Exit.Exit<A, E>>;

    /**
     * Runs an Effect in the background (fire-and-forget).
     * Errors are logged to console.
     */
    runEffectFork: <A, E>(effect: Effect.Effect<A, E, AppServices>) => void;

    /**
     * Whether the runtime is ready to use.
     */
    isReady: boolean;
}

const EffectContext = createContext<EffectContextValue | null>(null);

interface EffectProviderProps {
    prisma: PrismaClient;
    ollama: Ollama;
    children: React.ReactNode;
}

/**
 * Provides the Effect runtime to the React tree.
 *
 * @example
 * ```tsx
 * <EffectProvider prisma={prismaClient} ollama={ollamaClient}>
 *   <App />
 * </EffectProvider>
 * ```
 */
export function EffectProvider({
    prisma,
    ollama,
    children,
}: EffectProviderProps): React.ReactElement {
    const [runtime, setRuntime] = useState<RuntimeBridge<AppServices> | null>(null);

    useEffect(() => {
        // Create the combined service layer
        const prismaLayer = PrismaLive(prisma);
        const ollamaLayer = OllamaLive(ollama);
        const appLayer = Layer.merge(prismaLayer, ollamaLayer);

        // Create the runtime bridge
        const bridge = createRuntimeBridge(appLayer, { logErrors: true });
        setRuntime(bridge);

        // Cleanup on unmount
        return () => {
            void bridge.dispose();
        };
    }, [prisma, ollama]);

    const runEffect = useCallback(
        <A, E>(effect: Effect.Effect<A, E, AppServices>): Promise<A> => {
            if (!runtime) {
                return Promise.reject(new Error('Effect runtime not initialized'));
            }
            return runtime.runPromise(effect);
        },
        [runtime]
    );

    const runEffectExit = useCallback(
        <A, E>(effect: Effect.Effect<A, E, AppServices>): Promise<Exit.Exit<A, E>> => {
            if (!runtime) {
                return Promise.reject(new Error('Effect runtime not initialized'));
            }
            return runtime.runPromiseExit(effect);
        },
        [runtime]
    );

    const runEffectFork = useCallback(
        <A, E>(effect: Effect.Effect<A, E, AppServices>): void => {
            if (!runtime) {
                console.error('Effect runtime not initialized');
                return;
            }
            runtime.runFork(effect);
        },
        [runtime]
    );

    const value: EffectContextValue = {
        runEffect,
        runEffectExit,
        runEffectFork,
        isReady: runtime !== null,
    };

    return (
        <EffectContext.Provider value={value}>
            {children}
        </EffectContext.Provider>
    );
}

/**
 * Hook to access the Effect runtime in React components.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { runEffect, isReady } = useEffect();
 *
 *   const handleClick = async () => {
 *     const result = await runEffect(someEffect);
 *   };
 * }
 * ```
 */
export function useEffectContext(): EffectContextValue {
    const context = useContext(EffectContext);
    if (!context) {
        throw new Error('useEffectContext must be used within an EffectProvider');
    }
    return context;
}

/**
 * Hook to run an Effect and get the result as React state.
 *
 * @param effect - The Effect to run
 * @param deps - Dependencies array (like useEffect)
 * @returns Object with result, error, and loading state
 */
export function useEffectResult<A, E>(
    effect: Effect.Effect<A, E, AppServices>,
    deps: React.DependencyList = []
): { data: A | null; error: E | null; loading: boolean } {
    const { runEffectExit, isReady } = useEffectContext();
    const [state, setState] = useState<{
        data: A | null;
        error: E | null;
        loading: boolean;
    }>({
        data: null,
        error: null,
        loading: true,
    });

    useEffect(() => {
        if (!isReady) return;

        let cancelled = false;

        void (async () => {
            const exit = await runEffectExit(effect);
            if (cancelled) return;

            if (exit._tag === 'Success') {
                setState({ data: exit.value, error: null, loading: false });
            } else {
                const failure = exit.cause;
                // Extract the first failure from the cause
                if (failure._tag === 'Fail') {
                    setState({ data: null, error: failure.error, loading: false });
                } else {
                    setState({ data: null, error: null, loading: false });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReady, ...deps]);

    return state;
}
