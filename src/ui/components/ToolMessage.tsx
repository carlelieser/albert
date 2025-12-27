import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../hooks/useMessages';
import { ShimmerText } from './ShimmerText';

const TOOL_PHRASES = ['running...', 'executing...', 'working...', 'processing...'];

interface ToolMessageProps {
    message: Message;
}

const MAX_OUTPUT_LENGTH = 500;
const MAX_ARGS_LENGTH = 100;

export function ToolMessage({ message }: ToolMessageProps): React.ReactElement {
    const statusIcon = message.isStreaming
        ? '...'
        : message.toolSuccess
            ? 'ok'
            : 'err';

    // Format arguments for display
    const argsDisplay = message.toolArgs
        ? JSON.stringify(message.toolArgs)
        : '';
    const truncatedArgs = argsDisplay.length > MAX_ARGS_LENGTH
        ? argsDisplay.slice(0, MAX_ARGS_LENGTH) + '...'
        : argsDisplay;

    // Format output for display
    const output = message.content || '';
    const truncatedOutput = output.length > MAX_OUTPUT_LENGTH
        ? output.slice(0, MAX_OUTPUT_LENGTH)
        : output;
    const outputWasTruncated = output.length > MAX_OUTPUT_LENGTH;

    return (
        <Box flexDirection="column" marginY={1} marginLeft={2}>
            {/* Header */}
            <Box>
                <Text color="gray" dimColor>
                    [{statusIcon}] {message.toolName}
                </Text>
                {message.toolExecutionMs !== undefined && (
                    <Text dimColor> ({message.toolExecutionMs}ms)</Text>
                )}
            </Box>

            {/* Arguments */}
            {truncatedArgs && (
                <Box marginLeft={2}>
                    <Text dimColor>{truncatedArgs}</Text>
                </Box>
            )}

            {/* Output */}
            {!message.isStreaming && output && (
                <Box marginLeft={2} marginTop={1} flexDirection="column">
                    <Text dimColor>{truncatedOutput}</Text>
                    {outputWasTruncated && (
                        <Text dimColor>
                            ... ({output.length - MAX_OUTPUT_LENGTH} more)
                        </Text>
                    )}
                </Box>
            )}

            {/* Loading indicator */}
            {message.isStreaming && (
                <Box marginLeft={2}>
                    <ShimmerText phrases={TOOL_PHRASES} />
                </Box>
            )}
        </Box>
    );
}
