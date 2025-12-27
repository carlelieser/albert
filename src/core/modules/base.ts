import type { Ollama } from 'ollama';
import type { Brain } from '../brain';

export abstract class BaseModule {
    protected brain: Brain | null = null;
    protected ollama: Ollama;
    protected readonly name: string;

    constructor(ollama: Ollama, name: string) {
        this.ollama = ollama;
        this.name = name;
    }

    init(brain: Brain): void {
        this.brain = brain;
        this.registerListeners();
    }

    abstract registerListeners(): void;
    abstract shutdown(): void | Promise<void>;

    getName(): string {
        return this.name;
    }

    getOllama(): Ollama {
        return this.ollama;
    }

    getBrain(): Brain | null {
        return this.brain;
    }
}
