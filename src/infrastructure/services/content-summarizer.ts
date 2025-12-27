import { Effect } from 'effect';
import { ollamaChat, type OllamaService } from './ollama.effect';
import { config } from '../../config';
import type { LLMError } from '../../domain/errors';

const SUMMARIZE_THRESHOLD = 4000;
const TARGET_LENGTH = 2000;

export function summarizeIfNeeded(
    content: string,
    context?: string
): Effect.Effect<string, LLMError, OllamaService> {
    if (content.length <= SUMMARIZE_THRESHOLD) {
        return Effect.succeed(content);
    }

    return summarizeContent(content, context);
}

function summarizeContent(
    content: string,
    context?: string
): Effect.Effect<string, LLMError, OllamaService> {
    const contextClause = context ? ` The user asked: "${context}"` : '';

    return ollamaChat({
        model: config.ollama.models.fast,
        messages: [
            {
                role: 'system',
                content: `You are a helpful assistant that summarizes content concisely. Extract the key information and present it clearly. Target ${TARGET_LENGTH} characters or less.`,
            },
            {
                role: 'user',
                content: `Summarize the following content, focusing on the most relevant information.${contextClause}\n\n---\n\n${content}`,
            },
        ],
    }).pipe(Effect.map((response) => response.message.content));
}
