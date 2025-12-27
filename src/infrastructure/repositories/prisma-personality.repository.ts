import { Effect } from 'effect';
import type { IPersonalityRepository } from '../../domain/repositories/personality.repository';
import type { PersonalityProfile, PersonalityTraits } from '../../domain/entities/personality';
import { prismaEffect, type PrismaService } from '../database/prisma.effect';
import { type DatabaseError, ProfileNotFoundError, TraitUpdateError } from '../../domain/errors';

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

/**
 * Prisma-based implementation of the Personality Repository.
 * All methods return Effects with typed errors.
 */
export class PrismaPersonalityRepository implements IPersonalityRepository<PrismaService> {
    getProfile(
        name = 'default'
    ): Effect.Effect<PersonalityProfile, ProfileNotFoundError | DatabaseError, PrismaService> {
        return prismaEffect('getProfile', (prisma) =>
            prisma.personalityProfile.findUnique({
                where: { name },
            })
        ).pipe(
            Effect.flatMap((profile) =>
                profile
                    ? Effect.succeed(this.mapProfile(profile))
                    : Effect.fail(new ProfileNotFoundError({ profileName: name }))
            )
        );
    }

    saveProfile(
        profile: Partial<PersonalityProfile> & { name: string }
    ): Effect.Effect<PersonalityProfile, DatabaseError, PrismaService> {
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

        return prismaEffect('saveProfile', (prisma) =>
            prisma.personalityProfile.upsert({
                where: { name: profile.name },
                update: data,
                create: data,
            })
        ).pipe(Effect.map((saved) => this.mapProfile(saved)));
    }

    updateTraits(
        name: string,
        traits: Partial<PersonalityTraits>
    ): Effect.Effect<
        PersonalityProfile,
        ProfileNotFoundError | TraitUpdateError | DatabaseError,
        PrismaService
    > {
        return prismaEffect('updateTraits', (prisma) =>
            prisma.personalityProfile.update({
                where: { name },
                data: traits,
            })
        ).pipe(
            Effect.map((updated) => this.mapProfile(updated)),
            Effect.mapError((error) =>
                error._tag === 'DatabaseError' && error.message.includes('Record to update not found')
                    ? new ProfileNotFoundError({ profileName: name })
                    : new TraitUpdateError({
                          trait: Object.keys(traits).join(', '),
                          value: traits,
                          message: error.message,
                          cause: error.cause,
                      })
            )
        );
    }

    getOrCreateDefault(): Effect.Effect<PersonalityProfile, DatabaseError, PrismaService> {
        return prismaEffect('getOrCreateDefault', (prisma) =>
            prisma.personalityProfile.findUnique({
                where: { name: 'default' },
            })
        ).pipe(
            Effect.flatMap((existing) =>
                existing
                    ? Effect.succeed(this.mapProfile(existing))
                    : prismaEffect('createDefault', (prisma) =>
                          prisma.personalityProfile.create({
                              data: { name: 'default', ...DEFAULT_TRAITS },
                          })
                      ).pipe(Effect.map((created) => this.mapProfile(created)))
            )
        );
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
