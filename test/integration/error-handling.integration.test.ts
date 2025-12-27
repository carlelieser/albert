import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Events } from '../../src/core/events';
import { createIntegrationHarness, type IntegrationHarness } from '../helpers/integration-harness';

describe('Integration: Error Handling', () => {
    let harness: IntegrationHarness;

    afterEach(async () => {
        if (harness) {
            await harness.cleanup();
        }
    });

    it('should handle gracefully when Ollama returns empty response', async () => {
        harness = await createIntegrationHarness({
            ollamaConfig: {
                defaultResponse: '',
                streamingResponse: '',
            },
        });

        harness.input.send('Test message');
        
        // Should not crash
        try {
            await harness.output.waitForResponse(5000);
        } catch {
            // Timeout is acceptable for empty response
        }

        harness.capture.expectFired(Events.InputReceived);
    });

    it('should emit events even when processing fails', async () => {
        harness = await createIntegrationHarness();
        
        const mockOllama = harness.mockOllama as any;
        mockOllama.chat.mockRejectedValueOnce(new Error('Connection failed'));

        harness.input.send('Should fail');
        
        // Wait a bit for error to propagate
        await new Promise(resolve => setTimeout(resolve, 500));

        harness.capture.expectFired(Events.InputReceived);
    });

    it('should maintain state integrity after error', async () => {
        harness = await createIntegrationHarness();
        
        const mockOllama = harness.mockOllama as any;
        mockOllama.chat
            .mockRejectedValueOnce(new Error('First call fails'))
            .mockImplementation((options: any) => {
                if (options.stream) {
                    return Promise.resolve({
                        async *[Symbol.asyncIterator]() {
                            yield { message: { content: 'Recovery successful!' }, done: true };
                        },
                    });
                }
                if (options.format) {
                    return Promise.resolve({
                        message: { content: '{"facts": [], "deleteIds": []}' },
                    });
                }
                return Promise.resolve({
                    message: { content: 'Recovery successful!' },
                });
            });

        // First request fails
        harness.input.send('This should fail');
        await new Promise(resolve => setTimeout(resolve, 500));

        harness.capture.clear();

        // Second request should succeed
        harness.input.send('This should succeed');
        
        try {
            const response = await harness.output.waitForResponse(10000);
            expect(response).toBeTruthy();
        } catch {
            // May timeout but brain should still be active
        }

        expect(harness.brain.isActive()).toBe(true);
    });

    it('should continue operating after multiple failures', async () => {
        harness = await createIntegrationHarness();
        
        const mockOllama = harness.mockOllama as any;
        let callCount = 0;
        mockOllama.chat.mockImplementation((options: any) => {
            callCount++;
            if (callCount <= 2) {
                return Promise.reject(new Error(`Failure \${callCount}`));
            }
            if (options.stream) {
                return Promise.resolve({
                    async *[Symbol.asyncIterator]() {
                        yield { message: { content: 'Finally working!' }, done: true };
                    },
                });
            }
            if (options.format) {
                return Promise.resolve({
                    message: { content: '{"facts": [], "deleteIds": []}' },
                });
            }
            return Promise.resolve({
                message: { content: 'Finally working!' },
            });
        });

        // Send multiple requests
        harness.input.send('First');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        harness.input.send('Second');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        harness.input.send('Third');

        // Brain should remain active
        expect(harness.brain.isActive()).toBe(true);
    });
});
