import { Effect, Stream } from 'effect';
import type { Message, Tool as OllamaTool } from 'ollama';
import { BaseModule } from './base';
import type { BrainEvent } from '../brain';
import { Events } from '../events';
import type { MemoryEntry } from '../../domain/entities/memory';
import type { IToolRegistry } from '../../domain/services/tool-registry';
import type { IToolExecutor } from '../../domain/services/tool-executor';
import { ToolExecutor } from '../../infrastructure/services/tool-executor';
import { toOllamaTool } from '../../domain/entities/tool';
import { config, type ModelsConfig } from '../../config';
import { ollamaChat, ollamaChatStream } from '../../infrastructure/services/ollama.effect';
import { summarizeIfNeeded } from '../../infrastructure/services/content-summarizer';
import type { LLMStreamError } from '../../domain/errors';
import type { AppServices } from '../../infrastructure/layers';

interface InputReceivedPayload {
    text: string;
}

interface MemoryResultPayload {
    requestId: string;
    entries: MemoryEntry[];
}

interface PersonalityResultPayload {
    requestId: string;
    systemPrompt: string;
}

interface KnowledgeFact {
    fact: string;
    source: string;
    confidence: number;
}

interface KnowledgeResultPayload {
    requestId: string;
    facts: KnowledgeFact[];
}

interface PendingRequest {
    inputText: string;
    memoryRequestId: string;
    personalityRequestId: string;
    knowledgeRequestId: string;
    memoryEntries?: MemoryEntry[];
    systemPrompt?: string;
    knowledgeFacts?: KnowledgeFact[];
}

export class ExecutiveModule extends BaseModule {
    private readonly pendingRequests = new Map<string, PendingRequest>();
    private readonly models: ModelsConfig;
    private readonly toolRegistry: IToolRegistry | null;
    private readonly toolExecutor: IToolExecutor;
    private readonly maxToolIterations: number;

    constructor(
        models: ModelsConfig = config.ollama.models,
        toolRegistry: IToolRegistry | null = null,
        maxToolIterations: number = 10
    ) {
        super('executive');
        this.models = models;
        this.toolRegistry = toolRegistry;
        this.toolExecutor = new ToolExecutor(toolRegistry);
        this.maxToolIterations = maxToolIterations;
    }

    registerListeners(): void {
        if (!this.brain) return;

        this.brain.on(Events.InputReceived, (event: BrainEvent) => {
            this.handleInput(event);
        });

        this.brain.on(Events.MemoryResult, (event: BrainEvent) => {
            this.handleMemoryResult(event);
        });

        this.brain.on(Events.PersonalityResult, (event: BrainEvent) => {
            this.handlePersonalityResult(event);
        });

        this.brain.on(Events.KnowledgeResult, (event: BrainEvent) => {
            this.handleKnowledgeResult(event);
        });
    }

    private generateRequestId(): string {
        return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private handleInput(event: BrainEvent): void {
        const payload = event.data as InputReceivedPayload;
        const inputText = payload.text;

        const memoryRequestId = this.generateRequestId();
        const personalityRequestId = this.generateRequestId();
        const knowledgeRequestId = this.generateRequestId();

        const requestKey = `${memoryRequestId}:${personalityRequestId}:${knowledgeRequestId}`;
        this.pendingRequests.set(requestKey, {
            inputText,
            memoryRequestId,
            personalityRequestId,
            knowledgeRequestId,
        });

        this.brain!.emit(Events.MemoryQuery, {
            count: 10,
            requestId: memoryRequestId,
        });

        this.brain!.emit(Events.PersonalityQuery, {
            requestId: personalityRequestId,
        });

        this.brain!.emit(Events.KnowledgeQuery, {
            query: inputText,
            requestId: knowledgeRequestId,
        });
    }

    private handleResultEvent<T extends { requestId: string }>(
        event: BrainEvent,
        getRequestId: (request: PendingRequest) => string,
        updateRequest: (request: PendingRequest, payload: T) => void
    ): void {
        const payload = event.data as T;
        for (const [key, request] of this.pendingRequests.entries()) {
            if (getRequestId(request) === payload.requestId) {
                updateRequest(request, payload);
                this.tryProcessRequest(key);
                break;
            }
        }
    }

    private handleMemoryResult(event: BrainEvent): void {
        this.handleResultEvent<MemoryResultPayload>(
            event,
            (r) => r.memoryRequestId,
            (r, p) => { r.memoryEntries = p.entries; }
        );
    }

    private handlePersonalityResult(event: BrainEvent): void {
        this.handleResultEvent<PersonalityResultPayload>(
            event,
            (r) => r.personalityRequestId,
            (r, p) => { r.systemPrompt = p.systemPrompt; }
        );
    }

    private handleKnowledgeResult(event: BrainEvent): void {
        this.handleResultEvent<KnowledgeResultPayload>(
            event,
            (r) => r.knowledgeRequestId,
            (r, p) => { r.knowledgeFacts = p.facts; }
        );
    }

    private tryProcessRequest(requestKey: string): void {
        const request = this.pendingRequests.get(requestKey);
        if (!request) return;

        if (
            request.memoryEntries === undefined ||
            request.systemPrompt === undefined ||
            request.knowledgeFacts === undefined
        ) {
            return;
        }

        this.pendingRequests.delete(requestKey);

        this.forkEffect(
            this.processInputEffect(
                request.inputText,
                request.memoryEntries,
                request.systemPrompt,
                request.knowledgeFacts
            )
        );
    }

    private processInputEffect(
        inputText: string,
        memoryEntries: MemoryEntry[],
        systemPrompt: string,
        knowledgeFacts: KnowledgeFact[]
    ): Effect.Effect<void, never, AppServices> {
        return Effect.gen(this, function* () {
            let enhancedSystemPrompt = systemPrompt;
            if (knowledgeFacts.length > 0) {
                const factsSection = knowledgeFacts
                    .map((f) => `- ${f.fact}`)
                    .join('\n');
                enhancedSystemPrompt += `\n\nContext:\n${factsSection}`;
            }

            if (this.toolRegistry && this.toolRegistry.getAll().length > 0) {
                const toolNames = this.toolRegistry.getDefinitions().map(t => t.name).join(', ');
                enhancedSystemPrompt +=
                    `\n\nYou have access to tools: ${toolNames}. These tools give you capabilities beyond your base knowledge—use them to fetch real-time data, search the web, or perform actions when the user's request requires current information.`;
            }

            const messages: Message[] = [
                { role: 'system', content: enhancedSystemPrompt },
            ];

            for (const entry of memoryEntries) {
                messages.push({
                    role: entry.role,
                    content: entry.content,
                });
            }

            messages.push({
                role: 'user',
                content: inputText,
            });

            this.brain!.emit(Events.MemoryStore, {
                role: 'user',
                content: inputText,
            });

            const tools: OllamaTool[] | undefined = this.toolRegistry
                ? this.toolRegistry.getDefinitions().map(toOllamaTool)
                : undefined;

            const expertMessages = [...messages];
            let iteration = 0;
            while (iteration < this.maxToolIterations) {
                const response = yield* ollamaChat({
                    model: this.models.expert,
                    messages: expertMessages,
                    tools,
                });

                const thinking = (response.message as { thinking?: string }).thinking;
                if (thinking) {
                    this.brain!.emit(Events.ThinkingReady, {
                        thinking,
                        model: this.models.expert,
                    });
                }

                if (response.message.tool_calls && response.message.tool_calls.length > 0) {
                    expertMessages.push(response.message);

                    const toolResults = yield* this.toolExecutor.executeAll(
                        response.message.tool_calls,
                        {
                            onStart: (correlationId, toolName, args) =>
                                this.brain!.emit(Events.ToolExecutionStart, { correlationId, toolName, arguments: args }),
                            onComplete: (correlationId, result) =>
                                this.brain!.emit(Events.ToolExecutionComplete, { correlationId, ...result }),
                            onError: (correlationId, result) =>
                                this.brain!.emit(Events.ToolExecutionError, { correlationId, ...result }),
                        }
                    );

                    for (const result of toolResults) {
                        const rawContent = result.success ? result.output : `Error: ${result.error}`;
                        const content = yield* summarizeIfNeeded(rawContent, inputText);
                        expertMessages.push({
                            role: 'tool',
                            content,
                            tool_name: result.toolName,
                        });
                    }

                    iteration++;
                    continue;
                }

                let summary = response.message.content;

                if (iteration > 0) {
                    expertMessages.push(response.message);
                    expertMessages.push({
                        role: 'system',
                        content: 'Summarize what you learned from the tools to help answer the original question.',
                    });

                    const summaryResponse = yield* ollamaChat({
                        model: this.models.expert,
                        messages: expertMessages,
                    });

                    const summaryThinking = (summaryResponse.message as { thinking?: string }).thinking;
                    if (summaryThinking) {
                        this.brain!.emit(Events.ThinkingReady, {
                            thinking: summaryThinking,
                            model: this.models.expert,
                        });
                    }

                    summary = summaryResponse.message.content;
                }

                const systemMessage = messages[0];
                if (systemMessage && systemMessage.role === 'system') {
                    systemMessage.content += `\n\nUse this analysis to inform your response:\n${summary}`;
                }

                yield* this.streamFinalResponseEffect(messages);
                break;
            }

            if (iteration >= this.maxToolIterations) {
                this.brain!.emit(Events.OutputReady, {
                    text: 'I reached the maximum number of tool iterations. Please try a simpler request.',
                    error: true,
                });
            }
        }).pipe(
            Effect.catchAll((error: unknown) => {
                let errorMessage = 'Unknown error';
                if (error && typeof error === 'object') {
                    if ('message' in error && typeof error.message === 'string') {
                        errorMessage = error.message;
                    } else if ('_tag' in error) {
                        errorMessage = `${String(error._tag)}: ${JSON.stringify(error)}`;
                    }
                }
                console.error('Executive module error:', error);
                this.brain!.emit(Events.OutputReady, {
                    text: `I encountered an error: ${errorMessage}`,
                    error: true,
                });
                return Effect.void;
            })
        );
    }

    private streamFinalResponseEffect(
        messages: Message[]
    ): Effect.Effect<void, LLMStreamError, AppServices> {
        let responseText = '';

        const stream = ollamaChatStream({
            model: this.models.main,
            messages,
        }).pipe(
            Stream.tap((chunk) =>
                Effect.sync(() => {
                    responseText += chunk.content;
                    this.brain!.emit(Events.OutputChunk, {
                        text: chunk.content,
                        done: chunk.done,
                    });
                })
            )
        );

        return stream.pipe(
            Stream.runDrain,
            Effect.tap(() =>
                Effect.sync(() => {
                    this.brain!.emit(Events.MemoryStore, {
                        role: 'assistant',
                        content: responseText,
                    });

                    this.brain!.emit(Events.OutputReady, {
                        text: responseText,
                    });
                })
            )
        );
    }

    async shutdown(): Promise<void> {
        this.pendingRequests.clear();
    }
}
