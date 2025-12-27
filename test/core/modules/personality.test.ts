import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PersonalityModule } from '../../../src/core/modules/personality';
import { Brain } from '../../../src/core/brain';
import { Events } from '../../../src/core/events';
import type { Ollama } from 'ollama';

describe('PersonalityModule', () => {
    let module: PersonalityModule;
    let brain: Brain;
    let mockOllama: Ollama;

    beforeEach(() => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        mockOllama = {} as Ollama;
        brain = new Brain();
        module = new PersonalityModule(mockOllama);
    });

    describe('initialization', () => {
        it('should have name "personality"', () => {
            expect(module.getName()).toBe('personality');
        });

        it('should have default traits', () => {
            module.init(brain);
            const traits = module.getTraits();

            expect(traits.formality).toBeDefined();
            expect(traits.verbosity).toBeDefined();
            expect(traits.warmth).toBeDefined();
            expect(traits.humor).toBeDefined();
            expect(traits.confidence).toBeDefined();
        });
    });

    describe('event handling', () => {
        beforeEach(() => {
            module.init(brain);
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
        beforeEach(() => {
            module.init(brain);
        });

        it('should adjust a numeric trait', () => {
            module.adjustTrait('formality', 0.8);
            expect(module.getTraits().formality).toBe(0.8);
        });

        it('should adjust a boolean trait', () => {
            module.adjustTrait('useEmoji', true);
            expect(module.getTraits().useEmoji).toBe(true);
        });

        it('should clamp numeric traits to 0-1 range', () => {
            module.adjustTrait('formality', 1.5);
            expect(module.getTraits().formality).toBe(1);

            module.adjustTrait('formality', -0.5);
            expect(module.getTraits().formality).toBe(0);
        });

        it('should adjust multiple traits at once', () => {
            module.adjustTraits({
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
        beforeEach(() => {
            module.init(brain);
        });

        it('should generate a system prompt', () => {
            const prompt = module.generateSystemPrompt();

            expect(prompt).toContain('Albert');
            expect(typeof prompt).toBe('string');
            expect(prompt.length).toBeGreaterThan(50);
        });

        it('should reflect formal style when formality is high', () => {
            module.adjustTrait('formality', 0.9);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toContain('formal');
        });

        it('should reflect casual style when formality is low', () => {
            module.adjustTrait('formality', 0.1);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toContain('casual');
        });

        it('should mention brevity when verbosity is low', () => {
            module.adjustTrait('verbosity', 0.1);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toMatch(/brief|concise|short/);
        });

        it('should mention warmth when warmth is high', () => {
            module.adjustTrait('warmth', 0.9);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toMatch(/warm|friendly/);
        });

        it('should mention humor when humor is high', () => {
            module.adjustTrait('humor', 0.8);
            const prompt = module.generateSystemPrompt();

            expect(prompt.toLowerCase()).toMatch(/humor|playful|wit/);
        });
    });

    describe('default traits', () => {
        it('should have sensible defaults', () => {
            module.init(brain);
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
            module.init(brain);
            await expect(module.shutdown()).resolves.not.toThrow();
        });
    });
});
