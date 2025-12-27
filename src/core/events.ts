export const Events = {
    // Core lifecycle
    CoreStarted: 'core_started',
    CoreStopped: 'core_stopped',

    // Input/Output
    InputReceived: 'input_received',
    OutputReady: 'output_ready',

    // Knowledge module
    KnowledgeQuery: 'knowledge_query',
    KnowledgeResult: 'knowledge_result',
    KnowledgeStore: 'knowledge_store',

    // Memory module
    MemoryQuery: 'memory_query',
    MemoryResult: 'memory_result',
    MemoryStore: 'memory_store',

    // Personality module
    PersonalityQuery: 'personality_query',
    PersonalityResult: 'personality_result',
    PersonalityAdjust: 'personality_adjust',
} as const;

export type EventType = (typeof Events)[keyof typeof Events];
