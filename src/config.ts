export const config = {
    ollama: {
        models: {
            main: process.env.OLLAMA_MODEL_MAIN ?? 'llama3.2:1b',
            helper: process.env.OLLAMA_MODEL_HELPER ?? 'gpt-oss:20b',
            expert: process.env.OLLAMA_MODEL_EXPERT ?? 'gpt-oss:20b',
            fast: process.env.OLLAMA_MODEL_FAST ?? 'llama3.2:1b',
        },
    },
    app: {
        title: process.env.APP_TITLE ?? 'Albert',
    },
} as const;

export type ModelTier = keyof typeof config.ollama.models;
export type ModelsConfig = typeof config.ollama.models;
