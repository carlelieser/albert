import type { Brain, BrainEvent } from '../brain';
import { Events } from '../events';

export abstract class BaseOutput {
    protected brain: Brain | null = null;
    protected readonly type: string;

    constructor(type: string) {
        this.type = type;
    }

    init(brain: Brain): void {
        this.brain = brain;
        this.brain.on(Events.OutputReady, (event: BrainEvent) => {
            this.handleOutput(event);
        });
    }

    shutdown(): void {
        this.brain = null;
    }

    getType(): string {
        return this.type;
    }

    getBrain(): Brain | null {
        return this.brain;
    }

    abstract handleOutput(event: BrainEvent): void;
}
