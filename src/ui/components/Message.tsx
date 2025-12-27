import React from 'react';
import { Box, Text } from 'ink';
import type { Message as MessageType } from '../hooks/useMessages';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';
import { ToolMessage } from './ToolMessage';
import { AnnotationMessage } from './AnnotationMessage';
import { ShimmerText } from './ShimmerText';

const STREAMING_PHRASES = ['...', 'writing...', 'composing...'];

// Configure marked with monochrome terminal renderer
marked.setOptions({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    renderer: new TerminalRenderer({
        code: (s: string) => s,
        codespan: (s: string) => s,
        strong: (s: string) => s,
        em: (s: string) => s,
        heading: (s: string) => s,
        listitem: (s: string) => `  ${s}`,
    }),
});

interface MessageProps {
    message: MessageType;
}

function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function Message({ message }: MessageProps): React.ReactElement {
    if (message.role === 'tool') {
        return <ToolMessage message={message} />;
    }

    if (message.role === 'annotation') {
        return <AnnotationMessage message={message} />;
    }

    const isUser = message.role === 'user';
    const roleName = isUser ? 'you' : 'albert';

    let content = message.content;
    if (!isUser && content && !message.isStreaming) {
        try {
            content = (marked.parse(content) as string).trim();
        } catch {
            // Fall back to raw content if markdown parsing fails
        }
    }

    return (
        <Box flexDirection="column" marginY={1}>
            <Box>
                <Text color={isUser ? 'gray' : 'white'} dimColor={isUser}>
                    {roleName}
                </Text>
                <Text color="gray" dimColor> · {formatTimestamp(message.timestamp)}</Text>
            </Box>
            <Box marginLeft={2} flexDirection="column">
                <Text>
                    {content}
                    {message.isStreaming && (
                        <ShimmerText phrases={STREAMING_PHRASES} />
                    )}
                </Text>
            </Box>
        </Box>
    );
}
