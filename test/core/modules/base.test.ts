import { describe, it, expect, beforeEach } from 'vitest';
import { BaseModule } from '../../../src/core/modules/base';
import { Brain } from '../../../src/core/brain';
import { createTestRuntime } from '../../helpers/test-runtime';

class TestModule extends BaseModule {
    public listenerRegistered = false;

    constructor() {
        super('test-module');
    }

    registerListeners(): void {
        this.listenerRegistered = true;
    }

    async shutdown(): Promise<void> {
        // cleanup
    }
}

describe('BaseModule', () => {
    let module: TestModule;

    beforeEach(() => {
        module = new TestModule();
    });

    it('should store the module name', () => {
        expect(module.getName()).toBe('test-module');
    });

    it('should call registerListeners on init', () => {
        const brain = new Brain();
        brain.setRuntime(createTestRuntime());
        module.init(brain);
        expect(module.listenerRegistered).toBe(true);
    });

    it('should store brain reference on init', () => {
        const brain = new Brain();
        brain.setRuntime(createTestRuntime());
        module.init(brain);
        expect(module.getBrain()).toBe(brain);
    });
});
