import type { PersonalityProfile, PersonalityTraits } from '../entities/personality';

export interface IPersonalityRepository {
    getProfile: (name?: string) => Promise<PersonalityProfile | null>;
    saveProfile: (
        profile: Partial<PersonalityProfile> & { name: string }
    ) => Promise<PersonalityProfile>;
    updateTraits: (name: string, traits: Partial<PersonalityTraits>) => Promise<PersonalityProfile>;
    getOrCreateDefault: () => Promise<PersonalityProfile>;
}
