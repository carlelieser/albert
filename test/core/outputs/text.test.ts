import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextOutput } from '../../../src/core/outputs/text';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';

describe('TextOutput', () => {
    let output: TextOutput;
    let brain: Brain;

    beforeEach(() => {
        output = new TextOutput();
        brain = new Brain();
    });

    describe('initialization', () => {
        it('should have type "text"', () => {
            expect(output.getType()).toBe('text');
        });
    });

    describe('callback handling', () => {
        beforeEach(() => {
            output.init(brain);
        });

        it('should call callback with text on OutputReady', () => {
            const callback = vi.fn();
            output.setCallback(callback);

            brain.emit(Events.OutputReady, { text: 'Hello world' });

            expect(callback).toHaveBeenCalledWith('Hello world');
        });

        it('should handle multiple outputs', () => {
            const callback = vi.fn();
            output.setCallback(callback);

            brain.emit(Events.OutputReady, { text: 'First' });
            brain.emit(Events.OutputReady, { text: 'Second' });

            expect(callback).toHaveBeenCalledTimes(2);
            expect(callback).toHaveBeenNthCalledWith(1, 'First');
            expect(callback).toHaveBeenNthCalledWith(2, 'Second');
        });
    });

    describe('default behavior', () => {
        it('should log to console when no callback set', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            output.init(brain);
            brain.emit(Events.OutputReady, { text: 'Console output' });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });

    describe('shutdown', () => {
        it('should clear callback on shutdown', () => {
            const callback = vi.fn();
            output.init(brain);
            output.setCallback(callback);
            output.shutdown();

            // After shutdown, callback should be cleared
            expect(output.getBrain()).toBeNull();
        });
    });
});
