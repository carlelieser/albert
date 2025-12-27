import type { Ollama } from 'ollama';
import { BaseModule } from './base';
import type { BrainEvent } from '../brain';
import { Events } from '../events';

export interface PersonalityTraits {
    formality: number;      // 0 = casual, 1 = formal
    verbosity: number;      // 0 = terse, 1 = elaborate
    warmth: number;         // 0 = neutral, 1 = warm/friendly
    humor: number;          // 0 = serious, 1 = playful
    confidence: number;     // 0 = hedging, 1 = assertive
    useEmoji: boolean;
    preferBulletPoints: boolean;
    askFollowUpQuestions: boolean;
}

interface PersonalityQueryPayload {
    requestId: string;
}

interface PersonalityAdjustPayload {
    trait: keyof PersonalityTraits;
    value: number | boolean;
}

const DEFAULT_TRAITS: PersonalityTraits = {
    formality: 0.3,
    verbosity: 0.4,
    warmth: 0.7,
    humor: 0.3,
    confidence: 0.6,
    useEmoji: false,
    preferBulletPoints: false,
    askFollowUpQuestions: true,
};

export class PersonalityModule extends BaseModule {
    private traits: PersonalityTraits;

    constructor(ollama: Ollama) {
        super(ollama, 'personality');
        this.traits = { ...DEFAULT_TRAITS };
    }

    registerListeners(): void {
        if (!this.brain) return;

        this.brain.on(Events.PersonalityQuery, (event: BrainEvent) => {
            const payload = event.data as PersonalityQueryPayload;
            const systemPrompt = this.generateSystemPrompt();

            this.brain!.emit(Events.PersonalityResult, {
                requestId: payload.requestId,
                systemPrompt,
                traits: { ...this.traits },
            });
        });

        this.brain.on(Events.PersonalityAdjust, (event: BrainEvent) => {
            const payload = event.data as PersonalityAdjustPayload;
            this.adjustTrait(payload.trait, payload.value);
        });
    }

    getTraits(): PersonalityTraits {
        return { ...this.traits };
    }

    adjustTrait(trait: keyof PersonalityTraits, value: number | boolean): void {
        if (typeof value === 'number') {
            // Clamp numeric values to 0-1
            (this.traits[trait] as number) = Math.max(0, Math.min(1, value));
        } else {
            (this.traits[trait] as boolean) = value;
        }
    }

    adjustTraits(adjustments: Partial<PersonalityTraits>): void {
        for (const [trait, value] of Object.entries(adjustments)) {
            this.adjustTrait(trait as keyof PersonalityTraits, value );
        }
    }

    generateSystemPrompt(): string {
        const styleDescriptors: string[] = [];

        // Formality
        if (this.traits.formality < 0.3) {
            styleDescriptors.push('casual and relaxed');
        } else if (this.traits.formality > 0.7) {
            styleDescriptors.push('professional and formal');
        } else {
            styleDescriptors.push('balanced in formality');
        }

        // Warmth
        if (this.traits.warmth > 0.6) {
            styleDescriptors.push('warm and friendly');
        }

        // Humor
        if (this.traits.humor > 0.5) {
            styleDescriptors.push('with a playful sense of humor and wit');
        }

        // Verbosity
        if (this.traits.verbosity < 0.3) {
            styleDescriptors.push('brief and concise');
        } else if (this.traits.verbosity > 0.7) {
            styleDescriptors.push('thorough and detailed');
        }

        const guidelines: string[] = [];

        // Confidence
        if (this.traits.confidence > 0.5) {
            guidelines.push('Be direct and confident in your responses');
        } else {
            guidelines.push('Acknowledge uncertainty when present');
        }

        // Follow-up questions
        if (this.traits.askFollowUpQuestions) {
            guidelines.push('Ask clarifying questions when helpful');
        } else {
            guidelines.push('Avoid unnecessary follow-up questions');
        }

        // Emoji
        if (this.traits.useEmoji) {
            guidelines.push('Use emoji sparingly for emphasis');
        } else {
            guidelines.push('Do not use emoji in responses');
        }

        // Bullet points
        if (this.traits.preferBulletPoints) {
            guidelines.push('Use bullet points for lists and steps');
        }

        // Response length
        if (this.traits.verbosity < 0.5) {
            guidelines.push('Keep responses short and to the point');
        } else {
            guidelines.push('Provide thorough explanations when needed');
        }

        return `You are Albert, an AI assistant with persistent memory and knowledge.

Your communication style: ${styleDescriptors.join(', ')}.

Guidelines:
${guidelines.map(g => `- ${g}`).join('\n')}

Core traits:
- You remember facts that users tell you
- You maintain context within conversations
- You're honest about what you don't know
- You provide helpful, accurate information`;
    }

    async shutdown(): Promise<void> {
        // Reset to defaults
        this.traits = { ...DEFAULT_TRAITS };
    }
}
