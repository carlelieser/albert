import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createIntegrationHarness, type IntegrationHarness } from '../helpers/integration-harness';
import { Events } from '../../src/core/events';

describe('Context Integration', () => {
    let harness: IntegrationHarness;

    afterEach(async () => {
        if (harness) {
            await harness.cleanup();
        }
    });

    describe('Knowledge Facts Integration', () => {
        it('should query knowledge module when processing input', async () => {
            harness = await createIntegrationHarness();
            
            harness.input.send('Hello');
            
            await harness.capture.waitFor(Events.KnowledgeQuery, 5000);
            harness.capture.expectFired(Events.KnowledgeQuery, 'KnowledgeQuery should be emitted');
        });

        it('should receive knowledge facts from repository', async () => {
            harness = await createIntegrationHarness();
            
            harness.mockStates.knowledge.facts.set(1, {
                id: 1,
                fact: 'User prefers TypeScript',
                source: 'user',
                confidence: 0.9,
                embedding: Array(384).fill(0.1),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            harness.input.send('What language do I prefer?');
            
            await harness.capture.waitFor(Events.KnowledgeResult, 5000);
            
            const knowledgeResult = harness.capture.getAll()
                .find(e => e.event === Events.KnowledgeResult);
            
            expect(knowledgeResult).toBeDefined();
            expect((knowledgeResult?.data as any).facts).toBeDefined();
        });

        it('should emit KnowledgeResult before processing completes', async () => {
            harness = await createIntegrationHarness();

            harness.input.send('Hello');
            
            await harness.output.waitForResponse(10000);
            
            harness.capture.expectBefore(
                Events.KnowledgeResult,
                Events.OutputReady
            );
        });
    });

    describe('Personality Integration', () => {
        it('should query personality module when processing input', async () => {
            harness = await createIntegrationHarness();
            
            harness.input.send('Hello');
            
            await harness.capture.waitFor(Events.PersonalityQuery, 5000);
            harness.capture.expectFired(Events.PersonalityQuery, 'PersonalityQuery should be emitted');
        });

        it('should receive personality-based system prompt', async () => {
            harness = await createIntegrationHarness();
            
            harness.mockStates.personality.profile = {
                id: 'test',
                name: 'test',
                formality: 0.8,
                verbosity: 0.6,
                warmth: 0.7,
                humor: 0.3,
                confidence: 0.9,
                useEmoji: false,
                useBulletPoints: true,
                askFollowUp: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            harness.input.send('Hello');
            
            await harness.capture.waitFor(Events.PersonalityResult, 5000);
            
            const personalityResult = harness.capture.getAll()
                .find(e => e.event === Events.PersonalityResult);
            
            expect(personalityResult).toBeDefined();
            expect((personalityResult?.data as any).systemPrompt).toBeDefined();
            expect(typeof (personalityResult?.data as any).systemPrompt).toBe('string');
        });

        it('should emit PersonalityResult before processing completes', async () => {
            harness = await createIntegrationHarness();

            harness.input.send('Hello');
            
            await harness.output.waitForResponse(10000);
            
            harness.capture.expectBefore(
                Events.PersonalityResult,
                Events.OutputReady
            );
        });
    });

    describe('Memory Integration', () => {
        it('should query memory module when processing input', async () => {
            harness = await createIntegrationHarness();
            
            harness.input.send('Hello');
            
            await harness.capture.waitFor(Events.MemoryQuery, 5000);
            harness.capture.expectFired(Events.MemoryQuery, 'MemoryQuery should be emitted');
        });

        it('should receive conversation history from memory', async () => {
            harness = await createIntegrationHarness();
            
            const sessionId = harness.mockStates.memory.activeSessionId;
            harness.mockStates.memory.entries.set(sessionId, [
                {
                    id: 'entry-1',
                    sessionId,
                    role: 'user',
                    content: 'Previous message',
                    timestamp: new Date(Date.now() - 60000),
                },
                {
                    id: 'entry-2',
                    sessionId,
                    role: 'assistant',
                    content: 'Previous response',
                    timestamp: new Date(Date.now() - 30000),
                },
            ]);

            harness.input.send('Hello');
            
            await harness.capture.waitFor(Events.MemoryResult, 5000);
            
            const memoryResult = harness.capture.getAll()
                .find(e => e.event === Events.MemoryResult);
            
            expect(memoryResult).toBeDefined();
            expect((memoryResult?.data as any).entries).toHaveLength(2);
        });

        it('should emit MemoryResult before processing completes', async () => {
            harness = await createIntegrationHarness();

            harness.input.send('Hello');
            
            await harness.output.waitForResponse(10000);
            
            harness.capture.expectBefore(
                Events.MemoryResult,
                Events.OutputReady
            );
        });
    });

    describe('Parallel Context Gathering', () => {
        it('should query all three modules in parallel', async () => {
            harness = await createIntegrationHarness();

            harness.input.send('Hello');
            
            await harness.output.waitForResponse(10000);
            
            harness.capture.expectFired(Events.MemoryQuery);
            harness.capture.expectFired(Events.PersonalityQuery);
            harness.capture.expectFired(Events.KnowledgeQuery);
            
            harness.capture.expectFired(Events.MemoryResult);
            harness.capture.expectFired(Events.PersonalityResult);
            harness.capture.expectFired(Events.KnowledgeResult);
        });

        it('should only emit OutputReady after all results received', async () => {
            harness = await createIntegrationHarness();

            harness.input.send('Hello');
            
            await harness.output.waitForResponse(10000);
            
            harness.capture.expectBefore(Events.MemoryResult, Events.OutputReady);
            harness.capture.expectBefore(Events.PersonalityResult, Events.OutputReady);
            harness.capture.expectBefore(Events.KnowledgeResult, Events.OutputReady);
        });
    });
});
