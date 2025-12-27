import { describe, it, expect, beforeEach } from 'vitest';
import { BaseModule } from '../../../src/core/modules/base';
import { Brain } from '../../../src/core/brain';
import type { Ollama } from 'ollama';

class TestModule extends BaseModule {
    public listenerRegistered = false;

    registerListeners(): void {
        this.listenerRegistered = true;
    }

    async shutdown(): Promise<void> {
        // cleanup
    }
}

describe('BaseModule', () => {
    let module: TestModule;
    let mockOllama: Ollama;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        mockOllama = {} as Ollama;
        module = new TestModule(mockOllama, 'test-module');
    });

    it('should store the module name', () => {
        expect(module.getName()).toBe('test-module');
    });

    it('should store ollama instance', () => {
        expect(module.getOllama()).toBe(mockOllama);
    });

    it('should call registerListeners on init', () => {
        const brain = new Brain();
        module.init(brain);
        expect(module.listenerRegistered).toBe(true);
    });

    it('should store brain reference on init', () => {
        const brain = new Brain();
        module.init(brain);
        expect(module.getBrain()).toBe(brain);
    });
});
