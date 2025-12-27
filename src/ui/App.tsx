import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Text, useApp, useStdout, useInput } from 'ink';
import { MessageList } from './components/MessageList';
import { InputArea } from './components/InputArea';
import { useMessages } from './hooks/useMessages';
import { useStats } from './hooks/useStats';
import { useScrollable } from './hooks/useScrollable';
import { useThinkingPhrase } from './hooks/useThinkingPhrase';
import type { Brain } from '../core/brain';
import type { InkInput } from '../core/inputs/ink';
import type { InkOutput } from '../core/outputs/ink';
import { BrainProvider } from './context/BrainContext';

interface AppProps {
    brain: Brain;
    input: InkInput;
    output: InkOutput;
    modelName?: string;
    sessionId?: string;
}

function AppContent({ brain, input, output, modelName, sessionId }: AppProps): React.ReactElement {
    const { exit } = useApp();
    const { stdout } = useStdout();

    const {
        messages,
        currentStreamingId,
        addUserMessage,
        startAssistantMessage,
        appendToStreaming,
        finishStreaming,
        addToolMessage,
        completeToolMessage,
        addAnnotation,
        clearMessages,
    } = useMessages();

    // Track tool message IDs by correlationId
    const toolMessageIds = useRef(new Map<string, string>());

    // Track streaming state for error handling
    const isStreamingRef = useRef(false);

    const {
        stats,
        startProcessing,
        finishProcessing,
        setModelName,
        setSessionId,
    } = useStats();

    const thinkingPhrase = useThinkingPhrase(messages, stats.isProcessing);

    // Calculate viewport height (reserve 4 lines for input area)
    const viewportHeight = useMemo(() => {
        const rows = stdout?.rows || 24;
        return Math.max(5, rows - 4);
    }, [stdout?.rows]);

    const {
        scrollOffset,
        scrollUp,
        scrollDown,
        scrollToBottom,
        isAtTop,
        isAtBottom,
    } = useScrollable({
        itemCount: messages.length,
        viewportHeight: Math.floor(viewportHeight / 3), // Approximate messages per screen
        autoScrollToBottom: true,
    });

    // Set initial model and session
    useEffect(() => {
        if (modelName) {
            setModelName(modelName);
        }
        if (sessionId) {
            setSessionId(sessionId);
        }
    }, [modelName, sessionId, setModelName, setSessionId]);

    // Wire up output handlers
    useEffect(() => {
        output.setStreamStartHandler(() => {
            isStreamingRef.current = true;
            startAssistantMessage();
        });

        output.setChunkHandler((data) => {
            appendToStreaming(data.text);
            if (data.done) {
                scrollToBottom();
            }
        });

        output.setReadyHandler((data) => {
            // If no streaming message exists (e.g., error before streaming started),
            // create an assistant message directly
            if (!isStreamingRef.current) {
                startAssistantMessage();
            }
            isStreamingRef.current = false;
            finishStreaming(data.text);
            finishProcessing();
            scrollToBottom();
        });

        // Tool execution handlers
        output.setToolStartHandler((data) => {
            const msgId = addToolMessage(data.toolName, data.arguments);
            toolMessageIds.current.set(data.correlationId, msgId);
            scrollToBottom();
        });

        output.setToolCompleteHandler((data) => {
            const msgId = toolMessageIds.current.get(data.correlationId);
            if (msgId) {
                completeToolMessage(msgId, {
                    success: data.success,
                    output: data.output,
                    executionMs: data.executionTimeMs,
                });
                toolMessageIds.current.delete(data.correlationId);
            }
            scrollToBottom();
        });

        output.setMemoryResultHandler((data) => {
            const count = data.entries.length;
            const content = count > 0
                ? `Retrieved ${count} conversation entr${count === 1 ? 'y' : 'ies'}`
                : 'No conversation history found';
            addAnnotation('memory', content, { entryCount: count });
        });

        output.setKnowledgeResultHandler((data) => {
            const count = data.facts.length;
            if (count > 0) {
                const similarities = data.facts.map(f => f.similarity);
                const simDisplay = similarities.slice(0, 3).map(s => s.toFixed(2)).join(', ');
                const content = `Found ${count} relevant fact${count === 1 ? '' : 's'} (similarity: ${simDisplay}${count > 3 ? ', ...' : ''})`;
                addAnnotation('knowledge', content, { factCount: count, similarities });
            } else {
                addAnnotation('knowledge', 'No relevant facts found', { factCount: 0, similarities: [] });
            }
        });

        output.setPersonalityResultHandler((data) => {
            const t = data.traits;
            const content = `Applied: warmth=${t.warmth.toFixed(1)}, verbosity=${t.verbosity.toFixed(1)}, formality=${t.formality.toFixed(1)}`;
            addAnnotation('personality', content, {
                traits: {
                    warmth: t.warmth,
                    verbosity: t.verbosity,
                    formality: t.formality,
                    humor: t.humor,
                    confidence: t.confidence,
                },
            });
        });

        output.setThinkingHandler((data) => {
            addAnnotation('thinking', data.thinking, { model: data.model });
            scrollToBottom();
        });

        return () => {
            output.clearHandlers();
        };
    }, [
        output,
        startAssistantMessage,
        appendToStreaming,
        finishStreaming,
        addToolMessage,
        completeToolMessage,
        addAnnotation,
        finishProcessing,
        scrollToBottom,
    ]);

    // Handle keyboard shortcuts
    useInput((_input: string, key: { ctrl?: boolean; escape?: boolean }) => {
        if (key.ctrl && key.escape) {
            exit();
        }
    });

    const handleSubmit = useCallback((text: string) => {
        // Handle special commands
        const trimmed = text.trim().toLowerCase();

        if (trimmed === 'exit' || trimmed === 'quit') {
            exit();
            return;
        }

        if (trimmed === 'clear') {
            clearMessages();
            return;
        }

        // Add user message and send to brain
        addUserMessage(text);
        startProcessing();
        input.send(text);
    }, [addUserMessage, input, exit, clearMessages, startProcessing]);

    return (
        <Box
            flexDirection="column"
            height="100%"
            width="100%"
        >
            <MessageList
                messages={messages}
                height={viewportHeight}
                scrollOffset={scrollOffset}
                onScrollUp={scrollUp}
                onScrollDown={scrollDown}
                isAtTop={isAtTop}
                isAtBottom={isAtBottom}
            />

            {stats.isProcessing && (
                <Box paddingX={1}>
                    <Text color="gray" dimColor>{thinkingPhrase}</Text>
                </Box>
            )}

            <InputArea
                onSubmit={handleSubmit}
                disabled={!!currentStreamingId}
                placeholder={currentStreamingId ? '...' : ''}
            />
        </Box>
    );
}

export function App(props: AppProps): React.ReactElement {
    return (
        <BrainProvider brain={props.brain} input={props.input}>
            <AppContent {...props} />
        </BrainProvider>
    );
}
