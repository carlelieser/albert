import type { PrismaClient } from '../../generated/prisma/client';
import type { IPersonalityRepository } from '../../domain/repositories/personality.repository';
import type {
    PersonalityProfile,
    PersonalityTraits,
} from '../../domain/entities/personality';

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

export class PrismaPersonalityRepository implements IPersonalityRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async getProfile(name = 'default'): Promise<PersonalityProfile | null> {
        const profile = await this.prisma.personalityProfile.findUnique({
            where: { name },
        });

        if (!profile) return null;

        return this.mapProfile(profile);
    }

    async saveProfile(
        profile: Partial<PersonalityProfile> & { name: string }
    ): Promise<PersonalityProfile> {
        const data = {
            name: profile.name,
            formality: profile.formality ?? DEFAULT_TRAITS.formality,
            verbosity: profile.verbosity ?? DEFAULT_TRAITS.verbosity,
            warmth: profile.warmth ?? DEFAULT_TRAITS.warmth,
            humor: profile.humor ?? DEFAULT_TRAITS.humor,
            confidence: profile.confidence ?? DEFAULT_TRAITS.confidence,
            useEmoji: profile.useEmoji ?? DEFAULT_TRAITS.useEmoji,
            preferBulletPoints: profile.preferBulletPoints ?? DEFAULT_TRAITS.preferBulletPoints,
            askFollowUpQuestions:
                profile.askFollowUpQuestions ?? DEFAULT_TRAITS.askFollowUpQuestions,
        };

        const saved = await this.prisma.personalityProfile.upsert({
            where: { name: profile.name },
            update: data,
            create: data,
        });

        return this.mapProfile(saved);
    }

    async updateTraits(
        name: string,
        traits: Partial<PersonalityTraits>
    ): Promise<PersonalityProfile> {
        const updated = await this.prisma.personalityProfile.update({
            where: { name },
            data: traits,
        });

        return this.mapProfile(updated);
    }

    async getOrCreateDefault(): Promise<PersonalityProfile> {
        const existing = await this.prisma.personalityProfile.findUnique({
            where: { name: 'default' },
        });

        if (existing) {
            return this.mapProfile(existing);
        }

        const created = await this.prisma.personalityProfile.create({
            data: { name: 'default', ...DEFAULT_TRAITS },
        });

        return this.mapProfile(created);
    }

    private mapProfile(profile: {
        id: string;
        name: string;
        formality: number;
        verbosity: number;
        warmth: number;
        humor: number;
        confidence: number;
        useEmoji: boolean;
        preferBulletPoints: boolean;
        askFollowUpQuestions: boolean;
        createdAt: Date;
        updatedAt: Date;
    }): PersonalityProfile {
        return {
            id: profile.id,
            name: profile.name,
            formality: profile.formality,
            verbosity: profile.verbosity,
            warmth: profile.warmth,
            humor: profile.humor,
            confidence: profile.confidence,
            useEmoji: profile.useEmoji,
            preferBulletPoints: profile.preferBulletPoints,
            askFollowUpQuestions: profile.askFollowUpQuestions,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
    }
}
