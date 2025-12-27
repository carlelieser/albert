import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseInput } from '../../../src/core/inputs/base';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';

class TestInput extends BaseInput {
    constructor() {
        super('test-input');
    }

    // Expose protected emit for testing
    public testEmit(data: unknown): void {
        this.emit(Events.InputReceived, data);
    }
}

describe('BaseInput', () => {
    let input: TestInput;
    let brain: Brain;

    beforeEach(() => {
        input = new TestInput();
        brain = new Brain();
    });

    it('should store the input type', () => {
        expect(input.getType()).toBe('test-input');
    });

    it('should store brain reference on init', () => {
        input.init(brain);
        expect(input.getBrain()).toBe(brain);
    });

    it('should emit events through brain after init', () => {
        const listener = vi.fn();
        brain.on(Events.InputReceived, listener);

        input.init(brain);
        input.testEmit({ text: 'hello' });

        expect(listener).toHaveBeenCalledWith(
            expect.objectContaining({
                event: Events.InputReceived,
                data: { text: 'hello' },
            })
        );
    });

    it('should throw if emitting without init', () => {
        expect(() => { input.testEmit({ text: 'hello' }); }).toThrow();
    });

    it('should clear brain reference on shutdown', () => {
        input.init(brain);
        input.shutdown();
        expect(input.getBrain()).toBeNull();
    });
});
