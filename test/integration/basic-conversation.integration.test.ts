import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Events } from '../../src/core/events';
import { createIntegrationHarness, type IntegrationHarness } from '../helpers/integration-harness';

describe('Integration: Basic Conversation Flow', () => {
    let harness: IntegrationHarness;

    beforeEach(async () => {
        harness = await createIntegrationHarness({
            ollamaConfig: {
                defaultResponse: 'Hello! I am Albert, your AI assistant.',
                streamingResponse: 'Hello! I am Albert, your AI assistant.',
            },
        });
    });

    afterEach(async () => {
        await harness.cleanup();
    });

    it('should complete basic input -> output flow', async () => {
        harness.input.send('Hello, who are you?');

        const response = await harness.output.waitForResponse();

        expect(response).toContain('Albert');
        harness.capture.expectFired(Events.InputReceived);
        harness.capture.expectFired(Events.OutputReady);
    });

    it('should emit events in correct order', async () => {
        harness.input.send('Hello');

        await harness.output.waitForResponse();

        harness.capture.expectOrder([
            Events.InputReceived,
            Events.MemoryQuery,
            Events.PersonalityQuery,
            Events.KnowledgeQuery,
        ]);
    });

    it('should query all context modules before responding', async () => {
        harness.input.send('Test message');

        await harness.output.waitForResponse();

        harness.capture.expectFired(Events.MemoryQuery);
        harness.capture.expectFired(Events.PersonalityQuery);
        harness.capture.expectFired(Events.KnowledgeQuery);
        harness.capture.expectBefore(Events.MemoryQuery, Events.OutputReady);
    });

    it('should store conversation in memory', async () => {
        harness.input.send('Remember this message');

        await harness.output.waitForResponse();

        harness.capture.expectFired(Events.MemoryStore);
        
        const memoryStoreEvents = harness.capture.getByType(Events.MemoryStore);
        expect(memoryStoreEvents.length).toBeGreaterThanOrEqual(1);
    });
});
