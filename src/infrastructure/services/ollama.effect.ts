import { Effect, Context, Layer, Stream } from 'effect';
import type { Ollama, Message, Tool, ChatResponse } from 'ollama';
import { LLMError, LLMConnectionError, LLMStreamError, EmbeddingError } from '../../domain/errors';

// ============================================================================
// Service Definition
// ============================================================================

/**
 * OllamaService is an Effect Context tag for the Ollama client.
 * This allows Ollama to be injected as a dependency.
 */
export class OllamaService extends Context.Tag('OllamaService')<OllamaService, Ollama>() {}

// ============================================================================
// Types
// ============================================================================

export interface ChatOptions {
    readonly model: string;
    readonly messages: Message[];
    readonly tools?: Tool[];
    readonly format?: string | object;
}

export interface StreamChunk {
    readonly content: string;
    readonly done: boolean;
}

// ============================================================================
// Chat Effects
// ============================================================================

/**
 * Sends a chat request to Ollama and returns the response.
 *
 * @param options - Chat options including model, messages, and optional tools
 * @returns An Effect that resolves to the ChatResponse
 *
 * @example
 * ```ts
 * const response = yield* ollamaChat({
 *   model: "llama3.2",
 *   messages: [{ role: "user", content: "Hello!" }]
 * });
 * ```
 */
export function ollamaChat(
    options: ChatOptions
): Effect.Effect<ChatResponse, LLMError, OllamaService> {
    return Effect.gen(function* () {
        const ollama = yield* OllamaService;
        return yield* Effect.tryPromise({
            try: () =>
                ollama.chat({
                    model: options.model,
                    messages: options.messages,
                    tools: options.tools,
                    format: options.format,
                    stream: false,
                }),
            catch: (error) =>
                new LLMError({
                    model: options.model,
                    message: error instanceof Error ? error.message : 'Chat request failed',
                    cause: error,
                }),
        });
    });
}

/**
 * Sends a streaming chat request to Ollama.
 * Returns a Stream of content chunks.
 *
 * @param options - Chat options (streaming is forced on)
 * @returns A Stream of StreamChunk objects
 *
 * @example
 * ```ts
 * yield* ollamaChatStream({ model: "llama3.2", messages }).pipe(
 *   Stream.tap((chunk) => Effect.sync(() => process.stdout.write(chunk.content))),
 *   Stream.runDrain
 * );
 * ```
 */
export function ollamaChatStream(
    options: ChatOptions
): Stream.Stream<StreamChunk, LLMStreamError, OllamaService> {
    return Stream.unwrap(
        OllamaService.pipe(
            Effect.flatMap((ollama) =>
                Effect.tryPromise({
                    try: () =>
                        ollama.chat({
                            model: options.model,
                            messages: options.messages,
                            tools: options.tools,
                            format: options.format,
                            stream: true,
                        }),
                    catch: (error) =>
                        new LLMStreamError({
                            model: options.model,
                            message: error instanceof Error ? error.message : 'Stream creation failed',
                            cause: error,
                        }),
                })
            ),
            Effect.map((asyncIterable) =>
                Stream.fromAsyncIterable(asyncIterable, (error) =>
                    new LLMStreamError({
                        model: options.model,
                        message: error instanceof Error ? error.message : 'Stream failed',
                        cause: error,
                    })
                ).pipe(
                    Stream.map((chunk) => ({
                        content: chunk.message.content,
                        done: chunk.done,
                    }))
                )
            )
        )
    );
}

/**
 * Collects the full response text from a streaming chat.
 *
 * @param options - Chat options
 * @returns An Effect that resolves to the full response text
 */
export function ollamaChatStreamCollect(
    options: ChatOptions
): Effect.Effect<string, LLMStreamError, OllamaService> {
    return ollamaChatStream(options).pipe(
        Stream.map((chunk) => chunk.content),
        Stream.runCollect,
        Effect.map((chunks) => Array.from(chunks).join(''))
    );
}

// ============================================================================
// Embedding Effects
// ============================================================================

/**
 * Generates embeddings for the given text.
 *
 * @param model - The embedding model to use (e.g., "nomic-embed-text")
 * @param text - The text to embed
 * @returns An Effect that resolves to the embedding vector
 *
 * @example
 * ```ts
 * const embedding = yield* ollamaEmbed("nomic-embed-text", "Hello world");
 * ```
 */
export function ollamaEmbed(
    model: string,
    text: string
): Effect.Effect<number[], EmbeddingError, OllamaService> {
    return Effect.gen(function* () {
        const ollama = yield* OllamaService;
        const response = yield* Effect.tryPromise({
            try: () => ollama.embed({ model, input: text }),
            catch: (error) =>
                new EmbeddingError({
                    model,
                    text: text.slice(0, 100), // Truncate for error message
                    message: error instanceof Error ? error.message : 'Embedding generation failed',
                    cause: error,
                }),
        });
        return response.embeddings[0];
    });
}

/**
 * Generates embeddings for multiple texts in a batch.
 *
 * @param model - The embedding model to use
 * @param texts - Array of texts to embed
 * @returns An Effect that resolves to an array of embedding vectors
 */
export function ollamaEmbedBatch(
    model: string,
    texts: readonly string[]
): Effect.Effect<number[][], EmbeddingError, OllamaService> {
    return Effect.gen(function* () {
        const ollama = yield* OllamaService;
        const response = yield* Effect.tryPromise({
            try: () => ollama.embed({ model, input: texts as string[] }),
            catch: (error) =>
                new EmbeddingError({
                    model,
                    text: `[${texts.length} texts]`,
                    message: error instanceof Error ? error.message : 'Batch embedding failed',
                    cause: error,
                }),
        });
        return response.embeddings;
    });
}

// ============================================================================
// Model Management Effects
// ============================================================================

/**
 * Lists all available models on the Ollama server.
 */
export const ollamaListModels: Effect.Effect<
    Array<{ name: string; size: number; digest: string }>,
    LLMConnectionError,
    OllamaService
> = Effect.gen(function* () {
    const ollama = yield* OllamaService;
    const response = yield* Effect.tryPromise({
        try: () => ollama.list(),
        catch: (error) =>
            new LLMConnectionError({
                host: 'localhost',
                message: error instanceof Error ? error.message : 'Failed to list models',
                cause: error,
            }),
    });
    return response.models.map((m) => ({
        name: m.name,
        size: m.size,
        digest: m.digest,
    }));
});

/**
 * Checks if a specific model is available.
 *
 * @param modelName - The name of the model to check
 * @returns An Effect that resolves to true if the model exists
 */
export function ollamaHasModel(
    modelName: string
): Effect.Effect<boolean, LLMConnectionError, OllamaService> {
    return ollamaListModels.pipe(Effect.map((models) => models.some((m) => m.name === modelName)));
}

// ============================================================================
// Layer Construction
// ============================================================================

/**
 * Creates an OllamaService layer from an existing Ollama client.
 *
 * @param client - An existing Ollama client instance
 * @returns A Layer that provides OllamaService
 */
export function OllamaLive(client: Ollama): Layer.Layer<OllamaService> {
    return Layer.succeed(OllamaService, client);
}

/**
 * Creates an OllamaService layer that creates a new client.
 *
 * @param host - The Ollama server host (defaults to http://localhost:11434)
 * @returns A Layer that provides OllamaService
 */
export function OllamaLiveFromHost(host?: string): Layer.Layer<OllamaService, LLMConnectionError> {
    return Layer.effect(
        OllamaService,
        Effect.tryPromise({
            try: async () => {
                // Dynamic import to avoid bundling issues
                const { Ollama } = await import('ollama');
                return new Ollama({ host });
            },
            catch: (error) =>
                new LLMConnectionError({
                    host: host ?? 'http://localhost:11434',
                    message: error instanceof Error ? error.message : 'Failed to create Ollama client',
                    cause: error,
                }),
        })
    );
}

// ============================================================================
// Utility Effects
// ============================================================================

/**
 * Gets the raw Ollama client from the context.
 */
export const getOllama: Effect.Effect<Ollama, never, OllamaService> = OllamaService;

/**
 * Checks if the Ollama server is reachable.
 */
export const ollamaHealthCheck: Effect.Effect<boolean, LLMConnectionError, OllamaService> =
    ollamaListModels.pipe(Effect.map(() => true));
