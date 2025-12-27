import { Brain, type BrainEvent } from '../../src/core/brain';
import { Events, type EventType } from '../../src/core/events';

export interface CapturedEvent {
    timestamp: number;
    event: EventType;
    data: unknown;
}

export class EventCapture {
    private events: CapturedEvent[] = [];
    private brain: Brain;
    private listeners: Map<EventType, (event: BrainEvent) => void> = new Map();

    constructor(brain: Brain) {
        this.brain = brain;
        this.subscribeToAll();
    }

    private subscribeToAll(): void {
        for (const eventType of Object.values(Events)) {
            const listener = (event: BrainEvent) => {
                this.events.push({
                    timestamp: event.timestamp,
                    event: event.event,
                    data: event.data,
                });
            };
            this.listeners.set(eventType, listener);
            this.brain.on(eventType, listener);
        }
    }

    dispose(): void {
        for (const [eventType, listener] of this.listeners) {
            this.brain.off(eventType, listener);
        }
        this.listeners.clear();
    }

    clear(): void {
        this.events = [];
    }

    getAll(): CapturedEvent[] {
        return [...this.events];
    }

    getByType(eventType: EventType): CapturedEvent[] {
        return this.events.filter((e) => e.event === eventType);
    }

    getFirst(eventType: EventType): CapturedEvent | undefined {
        return this.events.find((e) => e.event === eventType);
    }

    getLast(eventType: EventType): CapturedEvent | undefined {
        const matching = this.getByType(eventType);
        return matching[matching.length - 1];
    }

    count(eventType: EventType): number {
        return this.getByType(eventType).length;
    }

    hasFired(eventType: EventType): boolean {
        return this.events.some((e) => e.event === eventType);
    }

    getEventSequence(): EventType[] {
        return this.events.map((e) => e.event);
    }

    expectFired(eventType: EventType, message?: string): void {
        if (!this.hasFired(eventType)) {
            const fired = this.getEventSequence().join(' -> ');
            throw new Error(
                message ?? `Expected event "\${eventType}" to fire. Events fired: \${fired || 'none'}`
            );
        }
    }

    expectNotFired(eventType: EventType, message?: string): void {
        if (this.hasFired(eventType)) {
            throw new Error(message ?? `Expected event "\${eventType}" NOT to fire, but it did`);
        }
    }

    expectOrder(expectedOrder: EventType[], message?: string): void {
        const sequence = this.getEventSequence();
        let seqIndex = 0;

        for (const expected of expectedOrder) {
            let found = false;
            while (seqIndex < sequence.length) {
                if (sequence[seqIndex] === expected) {
                    found = true;
                    seqIndex++;
                    break;
                }
                seqIndex++;
            }
            if (!found) {
                throw new Error(
                    message ??
                        `Expected event order violation: "\${expected}" not found in expected position. ` +
                            `Actual sequence: \${sequence.join(' -> ')}`
                );
            }
        }
    }

    expectBefore(eventA: EventType, eventB: EventType): void {
        const indexA = this.events.findIndex((e) => e.event === eventA);
        const indexB = this.events.findIndex((e) => e.event === eventB);

        if (indexA === -1) {
            throw new Error(`Event "\${eventA}" was never fired`);
        }
        if (indexB === -1) {
            throw new Error(`Event "\${eventB}" was never fired`);
        }
        if (indexA >= indexB) {
            throw new Error(`Expected "\${eventA}" to fire before "\${eventB}"`);
        }
    }

    waitFor(eventType: EventType, timeoutMs = 5000): Promise<CapturedEvent> {
        return new Promise((resolve, reject) => {
            const existing = this.getFirst(eventType);
            if (existing) {
                resolve(existing);
                return;
            }

            const timeout = setTimeout(() => {
                this.brain.off(eventType, listener);
                reject(new Error(`Timeout waiting for event "\${eventType}" after \${timeoutMs}ms`));
            }, timeoutMs);

            const listener = (event: BrainEvent) => {
                clearTimeout(timeout);
                this.brain.off(eventType, listener);
                resolve({
                    timestamp: event.timestamp,
                    event: event.event,
                    data: event.data,
                });
            };

            this.brain.on(eventType, listener);
        });
    }

    async waitForAll(eventTypes: EventType[], timeoutMs = 5000): Promise<CapturedEvent[]> {
        const results = await Promise.all(
            eventTypes.map((type) => this.waitFor(type, timeoutMs))
        );
        return results;
    }
}
