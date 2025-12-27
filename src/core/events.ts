export const Events = {
    // Core lifecycle
    CoreStarted: 'core_started',
    CoreStopped: 'core_stopped',

    // Input/Output
    InputReceived: 'input_received',
    OutputStreamStart: 'output_stream_start',
    OutputChunk: 'output_chunk',
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

    // Tool execution
    ToolExecutionStart: 'tool_execution_start',
    ToolExecutionComplete: 'tool_execution_complete',
    ToolExecutionError: 'tool_execution_error',

    // Model thinking
    ThinkingReady: 'thinking_ready',
} as const;

export type EventType = (typeof Events)[keyof typeof Events];
