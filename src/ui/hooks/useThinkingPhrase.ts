import { useState, useEffect, useRef } from 'react';
import { Effect } from 'effect';
import { ollamaChat } from '../../infrastructure/services/ollama.effect';
import { config } from '../../config';
import { useBrainContext } from '../context/BrainContext';
import type { Message } from './useMessages';

const SYSTEM_PROMPT = `Generate a single clever word in present tense that synonymous with "tinkering"`;

export function useThinkingPhrase(messages: Message[], isProcessing: boolean): string {
    const { brain } = useBrainContext();
    const [phrase, setPhrase] = useState('thinking...');
    const lastMessageId = useRef<string | null>(null);
    const isGenerating = useRef(false);

    useEffect(() => {
        if (!isProcessing || messages.length === 0 || isGenerating.current) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.id === lastMessageId.current) return;

        lastMessageId.current = lastMessage.id;
        isGenerating.current = true;

        brain.runEffect(
            Effect.gen(function* () {
                const response = yield* ollamaChat({
                    model: config.ollama.models.fast,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: JSON.stringify(lastMessage) },
                    ],
                });
                return response.message.content.trim().toLowerCase();
            })
        )
            .then((p) => p.length < 30 && setPhrase(p))
            .finally(() => { isGenerating.current = false; });
    }, [messages, isProcessing, brain]);

    return phrase;
}
