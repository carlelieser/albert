import { Brain, type Input, type Output, type BrainEvent } from '../../src/core/brain';
import { Events } from '../../src/core/events';

export class TestInput implements Input {
    private brain: Brain | null = null;

    getType(): string {
        return 'test';
    }

    init(brain: Brain): void {
        this.brain = brain;
    }

    shutdown(): void {
        this.brain = null;
    }

    send(text: string): void {
        if (!this.brain) {
            throw new Error('TestInput not initialized');
        }
        this.brain.emit(Events.InputReceived, { text, source: 'test' });
    }
}

export class TestOutput implements Output {
    private brain: Brain | null = null;
    private chunks: string[] = [];
    private responses: string[] = [];
    private resolvers: Array<(value: string) => void> = [];

    getType(): string {
        return 'test';
    }

    init(brain: Brain): void {
        this.brain = brain;

        brain.on(Events.OutputChunk, (event: BrainEvent) => {
            const data = event.data as { text?: string; done?: boolean };
            if (data.text) {
                this.chunks.push(data.text);
            }
        });

        brain.on(Events.OutputReady, (event: BrainEvent) => {
            const data = event.data as { text?: string };
            const response = data.text ?? this.chunks.join('');
            this.responses.push(response);
            this.chunks = [];
            
            const resolver = this.resolvers.shift();
            if (resolver) {
                resolver(response);
            }
        });
    }

    shutdown(): void {
        this.brain = null;
        this.chunks = [];
        this.responses = [];
        this.resolvers = [];
    }

    getResponses(): string[] {
        return [...this.responses];
    }

    getLastResponse(): string | undefined {
        return this.responses[this.responses.length - 1];
    }

    clear(): void {
        this.chunks = [];
        this.responses = [];
    }

    waitForResponse(timeoutMs = 10000): Promise<string> {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout waiting for response after ' + timeoutMs + 'ms'));
            }, timeoutMs);

            this.resolvers.push((response) => {
                clearTimeout(timeout);
                resolve(response);
            });
        });
    }
}
