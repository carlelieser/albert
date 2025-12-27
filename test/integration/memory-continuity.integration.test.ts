import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Events } from '../../src/core/events';
import { createIntegrationHarness, type IntegrationHarness } from '../helpers/integration-harness';

describe('Integration: Memory Continuity', () => {
    let harness: IntegrationHarness;

    beforeEach(async () => {
        harness = await createIntegrationHarness();
    });

    afterEach(async () => {
        await harness.cleanup();
    });

    it('should maintain conversation history across turns', async () => {
        harness.input.send('My name is Alex');
        await harness.output.waitForResponse();
        
        harness.capture.clear();
        
        harness.input.send('What is my name?');
        await harness.output.waitForResponse();

        harness.capture.expectFired(Events.MemoryQuery);
        harness.capture.expectFired(Events.MemoryResult);
        
        const memoryResults = harness.capture.getByType(Events.MemoryResult);
        expect(memoryResults.length).toBeGreaterThan(0);
    });

    it('should store both user and assistant messages', async () => {
        harness.input.send('First message');
        await harness.output.waitForResponse();

        const memoryStoreEvents = harness.capture.getByType(Events.MemoryStore);
        expect(memoryStoreEvents.length).toBeGreaterThanOrEqual(2);
    });

    it('should emit memory store after each exchange', async () => {
        harness.input.send('Hello');
        await harness.output.waitForResponse();

        const firstStoreCount = harness.capture.count(Events.MemoryStore);
        
        harness.input.send('How are you?');
        await harness.output.waitForResponse();

        const secondStoreCount = harness.capture.count(Events.MemoryStore);
        expect(secondStoreCount).toBeGreaterThan(firstStoreCount);
    });
});
