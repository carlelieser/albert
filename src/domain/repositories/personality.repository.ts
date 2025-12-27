import { type Effect } from 'effect';
import type { PersonalityProfile, PersonalityTraits } from '../entities/personality';
import type { DatabaseError, ProfileNotFoundError, TraitUpdateError } from '../errors';

/**
 * Effect-based Personality Repository interface.
 * All methods return Effects with typed errors.
 *
 * @typeParam R - The requirements/context type (e.g., PrismaService)
 */
export interface IPersonalityRepository<R = never> {
    /**
     * Gets a personality profile by name.
     */
    getProfile: (
        name?: string
    ) => Effect.Effect<PersonalityProfile, ProfileNotFoundError | DatabaseError, R>;

    /**
     * Saves a personality profile (creates or updates).
     */
    saveProfile: (
        profile: Partial<PersonalityProfile> & { name: string }
    ) => Effect.Effect<PersonalityProfile, DatabaseError, R>;

    /**
     * Updates specific traits for a profile.
     */
    updateTraits: (
        name: string,
        traits: Partial<PersonalityTraits>
    ) => Effect.Effect<PersonalityProfile, ProfileNotFoundError | TraitUpdateError | DatabaseError, R>;

    /**
     * Gets the default profile, creating it if it doesn't exist.
     */
    getOrCreateDefault: () => Effect.Effect<PersonalityProfile, DatabaseError, R>;
}
