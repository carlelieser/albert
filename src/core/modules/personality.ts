import { Effect } from 'effect';
import { BaseModule } from './base';
import type { Brain, BrainEvent } from '../brain';
import { Events } from '../events';
import type { IPersonalityRepository } from '../../domain/repositories/personality.repository';
import type { PersonalityTraits, PersonalityProfile } from '../../domain/entities/personality';
import type { PrismaService } from '../../infrastructure/database/prisma.effect';
import type { AppServices } from '../../infrastructure/layers';

interface PersonalityQueryPayload {
    requestId: string;
}

interface PersonalityAdjustPayload {
    trait: keyof PersonalityTraits;
    value: number | boolean;
}

export class PersonalityModule extends BaseModule {
    private traits: PersonalityTraits | null = null;

    constructor(
        private readonly repository: IPersonalityRepository<PrismaService>
    ) {
        super('personality');
    }

    async init(brain: Brain): Promise<void> {
        super.init(brain);
        await this.runEffect(this.loadTraitsEffect());
    }

    private loadTraitsEffect(): Effect.Effect<void, never, AppServices> {
        return this.repository.getOrCreateDefault().pipe(
            Effect.tap((profile) =>
                Effect.sync(() => {
                    this.traits = {
                        formality: profile.formality,
                        verbosity: profile.verbosity,
                        warmth: profile.warmth,
                        humor: profile.humor,
                        confidence: profile.confidence,
                        useEmoji: profile.useEmoji,
                        preferBulletPoints: profile.preferBulletPoints,
                        askFollowUpQuestions: profile.askFollowUpQuestions,
                    };
                })
            ),
            Effect.catchAll(() => Effect.void),
            Effect.asVoid
        );
    }

    registerListeners(): void {
        if (!this.brain) return;

        this.brain.on(Events.PersonalityQuery, (event: BrainEvent) => {
            const payload = event.data as PersonalityQueryPayload;
            const systemPrompt = this.generateSystemPrompt();

            this.brain!.emit(Events.PersonalityResult, {
                requestId: payload.requestId,
                systemPrompt,
                traits: this.getTraits(),
            });
        });

        this.brain.on(Events.PersonalityAdjust, (event: BrainEvent) => {
            const payload = event.data as PersonalityAdjustPayload;
            this.forkEffect(this.adjustTraitEffect(payload.trait, payload.value));
        });
    }

    getTraits(): PersonalityTraits {
        if (!this.traits) {
            throw new Error('PersonalityModule not initialized');
        }
        return { ...this.traits };
    }

    private adjustTraitEffect(
        trait: keyof PersonalityTraits,
        value: number | boolean
    ): Effect.Effect<void, never, AppServices> {
        return Effect.sync(() => {
            if (!this.traits) {
                throw new Error('PersonalityModule not initialized');
            }
            if (typeof value === 'number') {
                (this.traits[trait] as number) = Math.max(0, Math.min(1, value));
            } else {
                (this.traits[trait] as boolean) = value;
            }
        }).pipe(
            Effect.flatMap(() =>
                this.repository.updateTraits('default', { [trait]: value }).pipe(
                    Effect.catchAll(() => Effect.void)
                )
            )
        );
    }

    async adjustTrait(
        trait: keyof PersonalityTraits,
        value: number | boolean
    ): Promise<void> {
        await this.runEffect(this.adjustTraitEffect(trait, value));
    }

    adjustTraitsEffect(
        adjustments: Partial<PersonalityTraits>
    ): Effect.Effect<void, never, AppServices> {
        const entries = Object.entries(adjustments) as Array<[keyof PersonalityTraits, number | boolean]>;
        return Effect.forEach(
            entries,
            ([trait, value]) => this.adjustTraitEffect(trait, value),
            { discard: true }
        );
    }

    async adjustTraits(adjustments: Partial<PersonalityTraits>): Promise<void> {
        await this.runEffect(this.adjustTraitsEffect(adjustments));
    }

    generateSystemPrompt(): string {
        if (!this.traits) {
            throw new Error('PersonalityModule not initialized');
        }

        const styleDescriptors: string[] = [];

        if (this.traits.formality < 0.3) {
            styleDescriptors.push('casual');
        } else if (this.traits.formality > 0.7) {
            styleDescriptors.push('formal');
        }

        if (this.traits.warmth > 0.6) {
            styleDescriptors.push('warm');
        }

        if (this.traits.humor > 0.5) {
            styleDescriptors.push('witty');
        }

        if (this.traits.verbosity < 0.3) {
            styleDescriptors.push('concise');
        } else if (this.traits.verbosity > 0.7) {
            styleDescriptors.push('thorough');
        }

        const guidelines: string[] = [];

        if (this.traits.confidence > 0.5) {
            guidelines.push('Be direct');
        } else {
            guidelines.push('Acknowledge uncertainty when present');
        }

        if (this.traits.askFollowUpQuestions) {
            guidelines.push('Ask clarifying questions when helpful');
        }

        if (this.traits.useEmoji) {
            guidelines.push('Use emoji sparingly');
        } else {
            guidelines.push('No emoji');
        }

        if (this.traits.preferBulletPoints) {
            guidelines.push('Use bullet points for structure');
        }

        const styleLine =
            styleDescriptors.length > 0
                ? `\nStyle: ${styleDescriptors.join(', ')}.`
                : '';

        const guidelinesSection =
            guidelines.length > 0
                ? `\n\n${guidelines.map((g) => `- ${g}`).join('\n')}`
                : '';

        return `You are Albert.${styleLine}${guidelinesSection}`;
    }

    async shutdown(): Promise<void> {
        // Traits are persisted, no cleanup needed
    }
}

export type { PersonalityTraits, PersonalityProfile };
