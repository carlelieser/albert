import { describe, it, expect, afterEach } from 'vitest';
import { Events } from '../../src/core/events';
import { createIntegrationHarness, type IntegrationHarness } from '../helpers/integration-harness';

describe('Integration: Harness Verification', () => {
    let harness: IntegrationHarness | undefined;

    afterEach(async () => {
        if (harness) {
            await harness.cleanup();
        }
    });

    it('should create and awake brain', async () => {
        harness = await createIntegrationHarness();
        expect(harness.brain.isActive()).toBe(true);
    });

    it('should emit CoreStarted on awake', async () => {
        harness = await createIntegrationHarness();
        harness.capture.expectFired(Events.CoreStarted);
    });

    it('should emit InputReceived when sending input', async () => {
        harness = await createIntegrationHarness();
        harness.input.send('Hello');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        harness.capture.expectFired(Events.InputReceived);
    });

    it('should emit context queries on input', async () => {
        harness = await createIntegrationHarness();
        harness.input.send('Test');
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        harness.capture.expectFired(Events.MemoryQuery);
        harness.capture.expectFired(Events.PersonalityQuery);
        harness.capture.expectFired(Events.KnowledgeQuery);
    });

    it('should emit context results', async () => {
        harness = await createIntegrationHarness();
        harness.input.send('Test');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const events = harness.capture.getEventSequence();
        console.log('Events fired:', events);
        
        expect(harness.capture.hasFired(Events.MemoryResult)).toBe(true);
        expect(harness.capture.hasFired(Events.PersonalityResult)).toBe(true);
        expect(harness.capture.hasFired(Events.KnowledgeResult)).toBe(true);
    }, 10000);
});
