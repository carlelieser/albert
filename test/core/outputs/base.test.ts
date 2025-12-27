import { describe, it, expect, beforeEach } from 'vitest';
import { BaseOutput } from '../../../src/core/outputs/base';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';

class TestOutput extends BaseOutput {
    public lastHandledData: unknown = null;

    constructor() {
        super('test-output');
    }

    handleOutput(data: unknown): void {
        this.lastHandledData = data;
    }
}

describe('BaseOutput', () => {
    let output: TestOutput;
    let brain: Brain;

    beforeEach(() => {
        output = new TestOutput();
        brain = new Brain();
    });

    it('should store the output type', () => {
        expect(output.getType()).toBe('test-output');
    });

    it('should store brain reference on init', () => {
        output.init(brain);
        expect(output.getBrain()).toBe(brain);
    });

    it('should listen for OutputReady events after init', () => {
        output.init(brain);
        brain.emit(Events.OutputReady, { text: 'hello' });

        expect(output.lastHandledData).toEqual(
            expect.objectContaining({
                data: { text: 'hello' },
            })
        );
    });

    it('should clear brain reference on shutdown', () => {
        output.init(brain);
        output.shutdown();
        expect(output.getBrain()).toBeNull();
    });
});
