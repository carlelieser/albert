import { Effect } from 'effect';
import type { Brain } from '../brain';
import type { AppServices } from '../../infrastructure/layers';

export abstract class BaseModule {
    protected brain: Brain | null = null;
    protected readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    init(brain: Brain): void {
        this.brain = brain;
        this.registerListeners();
    }

    protected runEffect<A, E>(effect: Effect.Effect<A, E, AppServices>): Promise<A> {
        if (!this.brain) {
            throw new Error(`Module "${this.name}" not initialized. Call init() first.`);
        }
        return this.brain.runEffect(effect);
    }

    protected forkEffect<A, E>(effect: Effect.Effect<A, E, AppServices>): void {
        if (!this.brain) {
            throw new Error(`Module "${this.name}" not initialized. Call init() first.`);
        }
        this.brain.forkEffect(effect);
    }

    abstract registerListeners(): void;
    abstract shutdown(): void | Promise<void>;

    getName(): string {
        return this.name;
    }

    getBrain(): Brain | null {
        return this.brain;
    }
}
