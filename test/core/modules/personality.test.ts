import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Effect } from 'effect';
import { PersonalityModule } from '../../../src/core/modules/personality';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';
import type { IPersonalityRepository } from '../../../src/domain/repositories/personality.repository';
import type { PersonalityProfile } from '../../../src/domain/entities/personality';
import type { PrismaService } from '../../../src/infrastructure/database/prisma.effect';
import { createTestRuntime } from '../../helpers/test-runtime';

function createMockPersonalityRepository(): IPersonalityRepository<PrismaService> {
    const defaultProfile: PersonalityProfile = {
        id: 'default',
        name: 'default',
        formality: 0.4,
        verbosity: 0.4,
        warmth: 0.7,
        humor: 0.3,
        confidence: 0.6,
        useEmoji: false,
        preferBulletPoints: true,
        askFollowUpQuestions: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    return {
        getProfile: vi.fn().mockReturnValue(Effect.succeed(defaultProfile)),
        saveProfile: vi.fn().mockReturnValue(Effect.succeed(defaultProfile)),
        updateTraits: vi.fn().mockReturnValue(Effect.succeed(defaultProfile)),
        getOrCreateDefault: vi.fn().mockReturnValue(Effect.succeed(defaultProfile)),
    };
}

describe('PersonalityModule', () => {
    let module: PersonalityModule;
    let brain: Brain;
    let mockRepository: IPersonalityRepository<PrismaService>;

    beforeEach(() => {
        brain = new Brain();
        brain.setRuntime(createTestRuntime());
        mockRepository = createMockPersonalityRepository();
        module = new PersonalityModule(mockRepository);
    });

    describe('initialization', () => {
        it('should have name "personality"', () => {
            expect(module.getName()).toBe('personality');
        });

        it('should have default traits', async () => {
            await module.init(brain);
            const traits = module.getTraits();

            expect(traits.formality).toBeDefined();
            expect(traits.verbosity).toBeDefined();
            expect(traits.warmth).toBeDefined();
            expect(traits.humor).toBeDefined();
            expect(traits.confidence).toBeDefined();
        });
    });

    describe('event handling', () => {
        beforeEach(async () => {
            await module.init(brain);
        });

        it('should emit PersonalityResult on PersonalityQuery', () => {
            const resultListener = vi.fn();
            brain.on(Events.PersonalityResult, resultListener);

            brain.emit(Events.PersonalityQuery, {
                requestId: 'req-123',
            });

            expect(resultListener).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        requestId: 'req-123',
                        systemPrompt: expect.any(String),
                    }),
                })
            );
        });

        it('should adjust trait on PersonalityAdjust', () => {
            brain.emit(Events.PersonalityAdjust, {
                trait: 'formality',
                value: 0.9,
            });

            const traits = module.getTraits();
            expect(traits.formality).toBe(0.9);
        });
    });

    describe('traits', () => {
        beforeEach(async () => {
            await module.init(brain);
        });

        it('should adjust a numeric trait', async () => {
            await module.adjustTrait('formality', 0.8);
            expect(module.getTraits().formality).toBe(0.8);
        });

        it('should adjust a boolean trait', async () => {
            await module.adjustTrait('useEmoji', true);
            expect(module.getTraits().useEmoji).toBe(true);
        });

        it('should clamp numeric traits to 0-1 range', async () => {
            await module.adjustTrait('formality', 1.5);
            expect(module.getTraits().formality).toBe(1);

            await module.adjustTrait('formality', -0.5);
            expect(module.getTraits().formality).toBe(0);
        });

        it('should adjust multiple traits at once', async () => {
            await module.adjustTraits({
                formality: 0.8,
                humor: 0.9,
                useEmoji: true,
            });

            const traits = module.getTraits();
            expect(traits.formality).toBe(0.8);
            expect(traits.humor).toBe(0.9);
            expect(traits.useEmoji).toBe(true);
        });
    });

    describe('system prompt generation', () => {
        beforeEach(async () => {
            await module.init(brain);
        });

        it('should generate a system prompt', () => {
            const prompt = module.generateSystemPrompt();

            expect(prompt).toContain('Albert');
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(50);
        });

        it('should reflect formal style when formality is high', async () => {
            await module.adjustTrait('formality', 0.9);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toContain('formal');
        });

        it('should reflect casual style when formality is low', async () => {
            await module.adjustTrait('formality', 0.1);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toContain('casual');
        });

        it('should mention brevity when verbosity is low', async () => {
            await module.adjustTrait('verbosity', 0.1);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toMatch(/brief|concise|short/);
        });

        it('should mention warmth when warmth is high', async () => {
            await module.adjustTrait('warmth', 0.9);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toMatch(/warm|friendly/);
        });

        it('should mention humor when humor is high', async () => {
            await module.adjustTrait('humor', 0.8);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toMatch(/humor|playful|wit/);
        });
    });

    describe('default traits', () => {
        it('should have sensible defaults', async () => {
            await module.init(brain);
            const traits = module.getTraits();

            // Should lean casual but not too casual
            expect(traits.formality).toBeGreaterThan(0.1);
            expect(traits.formality).toBeLessThan(0.6);

            // Should be friendly
            expect(traits.warmth).toBeGreaterThan(0.5);

            // Should be concise by default
            expect(traits.verbosity).toBeLessThan(0.6);

            // Emoji off by default
            expect(traits.useEmoji).toBe(false);
        });
    });

    describe('shutdown', () => {
        it('should not throw on shutdown', async () => {
            await module.init(brain);
            await expect(module.shutdown()).resolves.not.toThrow();
        });
    });
});
