import type { Brain } from '../brain';
import type { EventType } from '../events';

export abstract class BaseInput {
    protected brain: Brain | null = null;
    protected readonly type: string;

    constructor(type: string) {
        this.type = type;
    }

    init(brain: Brain): void {
        this.brain = brain;
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

    protected emit(event: EventType, data: unknown): void {
        if (!this.brain) {
            throw new Error('Input not initialized - brain is null');
        }
        this.brain.emit(event, data);
    }
}
