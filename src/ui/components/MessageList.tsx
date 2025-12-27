import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { Message } from './Message';
import type { Message as MessageType } from '../hooks/useMessages';

interface MessageListProps {
    messages: MessageType[];
    height: number;
    scrollOffset: number;
    onScrollUp: () => void;
    onScrollDown: () => void;
    isAtTop: boolean;
    isAtBottom: boolean;
}

export function MessageList({
    messages,
    height,
    scrollOffset,
    onScrollUp,
    onScrollDown,
    isAtTop,
    isAtBottom,
}: MessageListProps): React.ReactElement {
    useInput((_input: string, key: {
        upArrow?: boolean;
        downArrow?: boolean;
        ctrl?: boolean;
        pageUp?: boolean;
        pageDown?: boolean;
    }) => {
        if (key.upArrow && key.ctrl) {
            onScrollUp();
        } else if (key.downArrow && key.ctrl) {
            onScrollDown();
        } else if (key.pageUp) {
            for (let i = 0; i < 5; i++) onScrollUp();
        } else if (key.pageDown) {
            for (let i = 0; i < 5; i++) onScrollDown();
        }
    });

    const visibleMessages = useMemo(() => {
        if (messages.length === 0) return [];

        const estimatedLinesPerMessage = 3;
        const maxVisibleMessages = Math.floor(height / estimatedLinesPerMessage);

        const startIdx = Math.max(0, scrollOffset);
        const endIdx = Math.min(messages.length, startIdx + maxVisibleMessages);

        return messages.slice(startIdx, endIdx);
    }, [messages, height, scrollOffset]);

    if (messages.length === 0) {
        return (
            <Box
                flexGrow={1}
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                paddingY={2}
            >
                <Text color="gray" dimColor>...</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
            {!isAtTop && (
                <Box justifyContent="center">
                    <Text color="gray" dimColor>···</Text>
                </Box>
            )}

            <Box flexDirection="column" flexGrow={1} paddingX={1}>
                {visibleMessages.map(msg => (
                    <Message key={msg.id} message={msg} />
                ))}
            </Box>

            {!isAtBottom && messages.length > 0 && (
                <Box justifyContent="center">
                    <Text color="gray" dimColor>···</Text>
                </Box>
            )}
        </Box>
    );
}
