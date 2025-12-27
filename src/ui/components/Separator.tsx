import React from 'react';
import { Box, Text } from 'ink';

interface SeparatorProps {
    width?: number | string;
}

export function Separator({ width = '100%' }: SeparatorProps): React.ReactElement {
    return (
        <Box width={width}>
            <Text color="gray" dimColor>
                {'─'.repeat(80)}
            </Text>
        </Box>
    );
}
