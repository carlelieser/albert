import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Separator } from './Separator';

interface InputAreaProps {
    onSubmit: (text: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function InputArea({ onSubmit, disabled = false, placeholder = 'Type here...' }: InputAreaProps): React.ReactElement {
    const [value, setValue] = useState('');
    const [cursorPosition, setCursorPosition] = useState(0);

    const handleSubmit = useCallback(() => {
        const trimmed = value.trim();
        if (trimmed && !disabled) {
            onSubmit(trimmed);
            setValue('');
            setCursorPosition(0);
        }
    }, [value, disabled, onSubmit]);

    useInput((input: string, key: {
        return?: boolean;
        shift?: boolean;
        backspace?: boolean;
        delete?: boolean;
        leftArrow?: boolean;
        rightArrow?: boolean;
        upArrow?: boolean;
        downArrow?: boolean;
        ctrl?: boolean;
        meta?: boolean;
    }) => {
        if (disabled) return;

        if (key.return) {
            if (key.shift) {
                const before = value.slice(0, cursorPosition);
                const after = value.slice(cursorPosition);
                setValue(before + '\n' + after);
                setCursorPosition(cursorPosition + 1);
            } else {
                handleSubmit();
            }
            return;
        }

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (key.backspace || key.delete) {
            if (cursorPosition > 0) {
                const before = value.slice(0, cursorPosition - 1);
                const after = value.slice(cursorPosition);
                setValue(before + after);
                setCursorPosition(cursorPosition - 1);
            }
            return;
        }

        if (key.leftArrow) {
            setCursorPosition(Math.max(0, cursorPosition - 1));
            return;
        }

        if (key.rightArrow) {
            setCursorPosition(Math.min(value.length, cursorPosition + 1));
            return;
        }

        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        if (key.upArrow || key.downArrow) {
            const lines = value.split('\n');
            let currentLine = 0;
            let posInLine = cursorPosition;

            for (let i = 0; i < lines.length; i++) {
                if (posInLine <= lines[i].length) {
                    currentLine = i;
                    break;
                }
                posInLine -= lines[i].length + 1;
            }

            if (key.upArrow && currentLine > 0) {
                let newPos = 0;
                for (let i = 0; i < currentLine - 1; i++) {
                    newPos += lines[i].length + 1;
                }
                newPos += Math.min(posInLine, lines[currentLine - 1].length);
                setCursorPosition(newPos);
            } else if (key.downArrow && currentLine < lines.length - 1) {
                let newPos = 0;
                for (let i = 0; i <= currentLine; i++) {
                    newPos += lines[i].length + 1;
                }
                newPos += Math.min(posInLine, lines[currentLine + 1].length);
                setCursorPosition(Math.min(newPos, value.length));
            }
            return;
        }

        if (input && !key.ctrl && !key.meta) {
            const before = value.slice(0, cursorPosition);
            const after = value.slice(cursorPosition);
            setValue(before + input + after);
            setCursorPosition(cursorPosition + input.length);
        }
    });

    const displayValue = value || placeholder;
    const showPlaceholder = !value;
    const lines = displayValue.split('\n');

    return (
        <Box flexDirection="column">
            <Separator />
            <Box paddingX={1} paddingY={0}>
                <Text color="white">{'> '}</Text>
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i} color={showPlaceholder ? 'gray' : 'white'} dimColor={showPlaceholder}>
                            {showPlaceholder && i === 0 && !disabled && (
                                <Text backgroundColor="white" color="black"> </Text>
                            )}
                            {line}
                            {i === lines.length - 1 && !disabled && !showPlaceholder && (
                                <Text backgroundColor="white" color="black"> </Text>
                            )}
                        </Text>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}
