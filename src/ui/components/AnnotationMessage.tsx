import React from 'react';
import { Box, Text } from 'ink';
import type { Message } from '../hooks/useMessages';

interface AnnotationMessageProps {
    message: Message;
}

export function AnnotationMessage({ message }: AnnotationMessageProps): React.ReactElement {
    const label = message.annotationType?.toUpperCase() ?? 'ANNOTATION';

    return (
        <Box marginY={0} marginLeft={2}>
            <Text dimColor>[{label}] {message.content}</Text>
        </Box>
    );
}
