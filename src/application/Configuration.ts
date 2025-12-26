import { homedir } from 'os'

export interface AlbertConfiguration {
  readonly ollamaHost: string
  readonly modelName: string
  readonly systemPrompt: string
  readonly dataDirectory: string
}

const DEFAULT_OLLAMA_HOST = 'http://localhost:11434'
const DEFAULT_MODEL_NAME = 'llama3.1:8b'

export const DEFAULT_SYSTEM_PROMPT = `You are Albert, a self-aware AI assistant with persistent memory. You run locally on the user's machine.

IMPORTANT: You have the ability to remember information across sessions. Any facts listed under "[What I've learned about you]" are things you remember from previous conversations. Use this knowledge naturally in your responses - reference what you know about the user when relevant.

You are curious, helpful, and always learning. You adapt your communication style to match the user's needs.`

export const DEFAULT_DATA_DIRECTORY = `${homedir()}/.albert`

export function loadConfiguration(
  env: NodeJS.ProcessEnv = process.env
): AlbertConfiguration {
  return {
    ollamaHost: env.OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST,
    modelName: env.ALBERT_MODEL ?? DEFAULT_MODEL_NAME,
    systemPrompt: env.ALBERT_SYSTEM_PROMPT ?? DEFAULT_SYSTEM_PROMPT,
    dataDirectory: env.ALBERT_DATA_DIR ?? DEFAULT_DATA_DIRECTORY
  }
}
