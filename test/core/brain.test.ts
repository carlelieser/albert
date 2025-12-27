import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Brain } from '../../src/core/brain';
import { Events } from '../../src/core/events';

describe('Brain', () => {
    let brain: Brain;

    beforeEach(() => {
        brain = new Brain();
    });

    describe('instantiation', () => {
        it('should be an EventEmitter', () => {
            expect(brain.on).toBeDefined();
            expect(brain.emit).toBeDefined();
        });

        it('should start inactive', () => {
            expect(brain.isActive()).toBe(false);
        });
    });

    describe('lifecycle', () => {
        it('should emit CoreStarted on awake', async () => {
            const listener = vi.fn();
            brain.on(Events.CoreStarted, listener);

            await brain.awake();

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should be active after awake', async () => {
            await brain.awake();
            expect(brain.isActive()).toBe(true);
        });

        it('should emit CoreStopped on sleep', async () => {
            const listener = vi.fn();
            brain.on(Events.CoreStopped, listener);

            await brain.awake();
            await brain.sleep();

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should be inactive after sleep', async () => {
            await brain.awake();
            await brain.sleep();
            expect(brain.isActive()).toBe(false);
        });

        it('should not awake twice', async () => {
            const listener = vi.fn();
            brain.on(Events.CoreStarted, listener);

            await brain.awake();
            await brain.awake();

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should not sleep when not awake', async () => {
            const listener = vi.fn();
            brain.on(Events.CoreStopped, listener);

            await brain.sleep();

            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('module registration', () => {
        it('should register a module', () => {
            const mockModule = {
                getName: () => 'test',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerModule(mockModule as any);
            expect(brain.getModule('test')).toBe(mockModule);
        });

        it('should throw on duplicate module registration', () => {
            const mockModule = {
                getName: () => 'test',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerModule(mockModule as any);
            expect(() => { brain.registerModule(mockModule as any); }).toThrow();
        });

        it('should initialize modules on awake', async () => {
            const mockModule = {
                getName: () => 'test',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerModule(mockModule as any);
            await brain.awake();

            expect(mockModule.init).toHaveBeenCalledWith(brain);
        });

        it('should shutdown modules on sleep', async () => {
            const mockModule = {
                getName: () => 'test',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerModule(mockModule as any);
            await brain.awake();
            await brain.sleep();

            expect(mockModule.shutdown).toHaveBeenCalled();
        });
    });

    describe('input registration', () => {
        it('should register an input', () => {
            const mockInput = {
                getType: () => 'text',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerInput(mockInput as any);
            expect(brain.getInput('text')).toBe(mockInput);
        });

        it('should throw on duplicate input registration', () => {
            const mockInput = {
                getType: () => 'text',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerInput(mockInput as any);
            expect(() => { brain.registerInput(mockInput as any); }).toThrow();
        });

        it('should initialize inputs on awake', async () => {
            const mockInput = {
                getType: () => 'text',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerInput(mockInput as any);
            await brain.awake();

            expect(mockInput.init).toHaveBeenCalledWith(brain);
        });
    });

    describe('output registration', () => {
        it('should register an output', () => {
            const mockOutput = {
                getType: () => 'text',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerOutput(mockOutput as any);
            expect(brain.getOutput('text')).toBe(mockOutput);
        });

        it('should throw on duplicate output registration', () => {
            const mockOutput = {
                getType: () => 'text',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerOutput(mockOutput as any);
            expect(() => { brain.registerOutput(mockOutput as any); }).toThrow();
        });

        it('should initialize outputs on awake', async () => {
            const mockOutput = {
                getType: () => 'text',
                init: vi.fn(),
                shutdown: vi.fn(),
            };

            brain.registerOutput(mockOutput as any);
            await brain.awake();

            expect(mockOutput.init).toHaveBeenCalledWith(brain);
        });
    });

    describe('event emission', () => {
        it('should wrap events with timestamp and data', () => {
            const listener = vi.fn();
            brain.on(Events.InputReceived, listener);

            brain.emit(Events.InputReceived, { text: 'hello' });

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    event: Events.InputReceived,
                    data: { text: 'hello' },
                    timestamp: expect.any(Number),
                })
            );
        });
    });
});
