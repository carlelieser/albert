export interface PersonalityTraits {
    formality: number;
    verbosity: number;
    warmth: number;
    humor: number;
    confidence: number;
    useEmoji: boolean;
    preferBulletPoints: boolean;
    askFollowUpQuestions: boolean;
}

export interface PersonalityProfile extends PersonalityTraits {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}
