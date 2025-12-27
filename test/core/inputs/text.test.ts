import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextInput } from '../../../src/core/inputs/text';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';

describe('TextInput', () => {
    let input: TextInput;
    let brain: Brain;

    beforeEach(() => {
        input = new TextInput();
        brain = new Brain();
    });

    describe('initialization', () => {
        it('should have type "text"', () => {
            expect(input.getType()).toBe('text');
        });
    });

    describe('send', () => {
        beforeEach(() => {
            input.init(brain);
        });

        it('should emit InputReceived event', () => {
            const listener = vi.fn();
            brain.on(Events.InputReceived, listener);

            input.send('Hello world');

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        text: 'Hello world',
                    }),
                })
            );
        });

        it('should include timestamp in event', () => {
            const listener = vi.fn();
            brain.on(Events.InputReceived, listener);

            input.send('Test');

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: expect.any(Number),
                })
            );
        });

        it('should handle empty string', () => {
            const listener = vi.fn();
            brain.on(Events.InputReceived, listener);

            input.send('');

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        text: '',
                    }),
                })
            );
        });
    });

    describe('before init', () => {
        it('should throw if send called before init', () => {
            expect(() => { input.send('test'); }).toThrow();
        });
    });

    describe('shutdown', () => {
        it('should clear brain reference', () => {
            input.init(brain);
            input.shutdown();
            expect(input.getBrain()).toBeNull();
        });
    });
});
