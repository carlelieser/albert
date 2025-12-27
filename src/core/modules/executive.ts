import type { Ollama, Message } from 'ollama';
import { BaseModule } from './base';
import type { BrainEvent } from '../brain';
import { Events } from '../events';
import type { MemoryEntry } from './memory';

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
    private readonly model: string;

    constructor(ollama: Ollama, model: string = 'llama3.1:8b') {
        super(ollama, 'executive');
        this.model = model;
    }

    registerListeners(): void {
        if (!this.brain) return;

        // Listen for user input
        this.brain.on(Events.InputReceived, (event: BrainEvent) => {
            this.handleInput(event);
        });

        // Listen for memory results
        this.brain.on(Events.MemoryResult, (event: BrainEvent) => {
            this.handleMemoryResult(event);
        });

        // Listen for personality results
        this.brain.on(Events.PersonalityResult, (event: BrainEvent) => {
            this.handlePersonalityResult(event);
        });

        // Listen for knowledge results
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

        // Generate unique request IDs
        const memoryRequestId = this.generateRequestId();
        const personalityRequestId = this.generateRequestId();
        const knowledgeRequestId = this.generateRequestId();

        // Store pending request
        const requestKey = `${memoryRequestId}:${personalityRequestId}:${knowledgeRequestId}`;
        this.pendingRequests.set(requestKey, {
            inputText,
            memoryRequestId,
            personalityRequestId,
            knowledgeRequestId,
        });

        // Query memory for conversation context
        this.brain!.emit(Events.MemoryQuery, {
            count: 10,
            requestId: memoryRequestId,
        });

        // Query personality for system prompt
        this.brain!.emit(Events.PersonalityQuery, {
            requestId: personalityRequestId,
        });

        // Query knowledge for relevant facts
        this.brain!.emit(Events.KnowledgeQuery, {
            query: inputText,
            requestId: knowledgeRequestId,
        });
    }

    private handleMemoryResult(event: BrainEvent): void {
        const payload = event.data as MemoryResultPayload;
        const requestId = payload.requestId;

        // Find the pending request
        for (const [key, request] of this.pendingRequests.entries()) {
            if (request.memoryRequestId === requestId) {
                request.memoryEntries = payload.entries;
                void this.tryProcessRequest(key);
                break;
            }
        }
    }

    private handlePersonalityResult(event: BrainEvent): void {
        const payload = event.data as PersonalityResultPayload;
        const requestId = payload.requestId;

        // Find the pending request
        for (const [key, request] of this.pendingRequests.entries()) {
            if (request.personalityRequestId === requestId) {
                request.systemPrompt = payload.systemPrompt;
                void this.tryProcessRequest(key);
                break;
            }
        }
    }

    private handleKnowledgeResult(event: BrainEvent): void {
        const payload = event.data as KnowledgeResultPayload;
        const requestId = payload.requestId;

        // Find the pending request
        for (const [key, request] of this.pendingRequests.entries()) {
            if (request.knowledgeRequestId === requestId) {
                request.knowledgeFacts = payload.facts;
                void this.tryProcessRequest(key);
                break;
            }
        }
    }

    private async tryProcessRequest(requestKey: string): Promise<void> {
        const request = this.pendingRequests.get(requestKey);
        if (!request) return;

        // Check if we have all required data
        if (
            request.memoryEntries === undefined ||
            request.systemPrompt === undefined ||
            request.knowledgeFacts === undefined
        ) {
            return; // Still waiting for responses
        }

        // Remove from pending
        this.pendingRequests.delete(requestKey);

        // Process the request
        await this.processInput(
            request.inputText,
            request.memoryEntries,
            request.systemPrompt,
            request.knowledgeFacts
        );
    }

    private async processInput(
        inputText: string,
        memoryEntries: MemoryEntry[],
        systemPrompt: string,
        knowledgeFacts: KnowledgeFact[]
    ): Promise<void> {
        try {
            // Build enhanced system prompt with knowledge
            let enhancedSystemPrompt = systemPrompt;
            if (knowledgeFacts.length > 0) {
                const factsSection = knowledgeFacts
                    .map(f => `- ${f.fact}`)
                    .join('\n');
                enhancedSystemPrompt += `\n\nRelevant facts you know about the user:\n${factsSection}`;
            }

            // Build messages for Ollama
            const messages: Message[] = [
                { role: 'system', content: enhancedSystemPrompt },
            ];

            // Add conversation history
            for (const entry of memoryEntries) {
                messages.push({
                    role: entry.role,
                    content: entry.content,
                });
            }

            // Add current user input
            messages.push({
                role: 'user',
                content: inputText,
            });

            // Store user message in memory
            this.brain!.emit(Events.MemoryStore, {
                role: 'user',
                content: inputText,
            });

            // Call Ollama
            const response = await this.ollama.chat({
                model: this.model,
                messages,
                stream: false,
            });

            const responseText = response.message.content;

            // Store assistant response in memory
            this.brain!.emit(Events.MemoryStore, {
                role: 'assistant',
                content: responseText,
            });

            // Emit output
            this.brain!.emit(Events.OutputReady, {
                text: responseText,
            });

            // Extract and store any personal facts from user input
            void this.extractAndStoreFacts(inputText);
        } catch (error) {
            // Emit error output
            this.brain!.emit(Events.OutputReady, {
                text: `I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error: true,
            });
        }
    }

    private async extractAndStoreFacts(userInput: string): Promise<void> {
        try {
            const response = await this.ollama.chat({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Extract any personal facts about the user from their message (name, preferences, occupation, location, etc.). Each fact should be a complete sentence.',
                    },
                    { role: 'user', content: userInput },
                ],
                stream: false,
                format: {
                    type: 'object',
                    properties: {
                        facts: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'List of personal facts extracted from the message, or empty if none found',
                        },
                    },
                    required: ['facts'],
                },
            });

            const parsed = JSON.parse(response.message.content) as { facts: string[] };
            for (const fact of parsed.facts) {
                if (fact && fact.length > 0) {
                    this.brain!.emit(Events.KnowledgeStore, {
                        fact,
                        source: 'user',
                        confidence: 0.9,
                    });
                }
            }
        } catch {
            // Silently fail - fact extraction is non-critical
        }
    }

    async shutdown(): Promise<void> {
        this.pendingRequests.clear();
    }
}
