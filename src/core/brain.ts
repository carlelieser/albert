import { EventEmitter } from 'node:events';
import { Events, type EventType } from './events';

export interface BrainEvent {
    timestamp: number;
    event: EventType;
    data: unknown;
}

export interface Module {
    getName: () => string;
    init: (brain: Brain) => void | Promise<void>;
    shutdown: () => void | Promise<void>;
}

export interface Input {
    getType: () => string;
    init: (brain: Brain) => void;
    shutdown: () => void;
}

export interface Output {
    getType: () => string;
    init: (brain: Brain) => void;
    shutdown: () => void;
}

export class Brain extends EventEmitter {
    private readonly modules = new Map<string, Module>();
    private readonly inputs = new Map<string, Input>();
    private readonly outputs = new Map<string, Output>();
    private active: boolean = false;

    emit(event: EventType, data?: unknown): boolean {
        const brainEvent: BrainEvent = {
            timestamp: Date.now(),
            event,
            data: data ?? null,
        };
        return super.emit(event, brainEvent);
    }

    isActive(): boolean {
        return this.active;
    }

    async awake(): Promise<void> {
        if (this.active) return;

        // Initialize all modules
        for (const module of this.modules.values()) {
            await module.init(this);
        }

        // Initialize all inputs
        for (const input of this.inputs.values()) {
            input.init(this);
        }

        // Initialize all outputs
        for (const output of this.outputs.values()) {
            output.init(this);
        }

        this.active = true;
        this.emit(Events.CoreStarted);
    }

    async sleep(): Promise<void> {
        if (!this.active) return;

        // Shutdown outputs first
        for (const output of this.outputs.values()) {
            output.shutdown();
        }

        // Shutdown inputs
        for (const input of this.inputs.values()) {
            input.shutdown();
        }

        // Shutdown modules last
        for (const module of this.modules.values()) {
            await module.shutdown();
        }

        this.active = false;
        this.emit(Events.CoreStopped);
    }

    registerModule(module: Module): void {
        const name = module.getName();
        if (this.modules.has(name)) {
            throw new Error(`Module "${name}" already registered`);
        }
        this.modules.set(name, module);
    }

    registerInput(input: Input): void {
        const type = input.getType();
        if (this.inputs.has(type)) {
            throw new Error(`Input type "${type}" already registered`);
        }
        this.inputs.set(type, input);
    }

    registerOutput(output: Output): void {
        const type = output.getType();
        if (this.outputs.has(type)) {
            throw new Error(`Output type "${type}" already registered`);
        }
        this.outputs.set(type, output);
    }

    getModule<T extends Module>(name: string): T | undefined {
        return this.modules.get(name) as T | undefined;
    }

    getInput<T extends Input>(type: string): T | undefined {
        return this.inputs.get(type) as T | undefined;
    }

    getOutput<T extends Output>(type: string): T | undefined {
        return this.outputs.get(type) as T | undefined;
    }
}
