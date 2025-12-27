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

    describe('event handling', () => {
        beforeEach(() => {
            output.init(brain);
        });

        it('should handle OutputReady event', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            brain.emit(Events.OutputReady, { text: 'Hello world' });

            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should handle OutputChunk events', () => {
            const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

            brain.emit(Events.OutputChunk, { text: 'chunk', done: false });

            expect(stdoutSpy).toHaveBeenCalled();
            stdoutSpy.mockRestore();
        });

        it('should handle multiple OutputReady events', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            brain.emit(Events.OutputReady, { text: 'First' });
            brain.emit(Events.OutputReady, { text: 'Second' });

            expect(consoleSpy).toHaveBeenCalledTimes(2);
            consoleSpy.mockRestore();
        });
    });

    describe('shutdown', () => {
        it('should clear brain reference on shutdown', () => {
            output.init(brain);
            output.shutdown();

            expect(output.getBrain()).toBeNull();
        });
    });
});
