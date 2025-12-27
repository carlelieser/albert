import React, { useState, useEffect } from 'react';
import { Text } from 'ink';

interface SinglePhraseProps {
    phrase: string;
    phrases?: never;
    interval?: never;
}

interface MultiPhraseProps {
    phrase?: never;
    phrases: string[];
    interval?: number;
}

type ShimmerTextProps = SinglePhraseProps | MultiPhraseProps;

export function ShimmerText(props: ShimmerTextProps): React.ReactElement {
    if ('phrase' in props && props.phrase !== undefined) {
        return <Text color="gray" dimColor>{props.phrase}</Text>;
    }

    const { phrases, interval = 600 } = props;
    const [currentPhrase, setCurrentPhrase] = useState(() =>
        phrases[Math.floor(Math.random() * phrases.length)]
    );

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentPhrase(phrases[Math.floor(Math.random() * phrases.length)]);
        }, interval);

        return () => clearInterval(timer);
    }, [phrases, interval]);

    return <Text color="gray" dimColor>{currentPhrase}</Text>;
}
