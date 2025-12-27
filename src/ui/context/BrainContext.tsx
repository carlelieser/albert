import React, { createContext, useContext, useCallback } from 'react';
import type { Brain } from '../../core/brain';
import type { InkInput } from '../../core/inputs/ink';

interface BrainContextValue {
    brain: Brain;
    input: InkInput;
    sendMessage: (text: string) => void;
}

const BrainContext = createContext<BrainContextValue | null>(null);

interface BrainProviderProps {
    brain: Brain;
    input: InkInput;
    children: React.ReactNode;
}

export function BrainProvider({ brain, input, children }: BrainProviderProps): React.ReactElement {
    const sendMessage = useCallback((text: string) => {
        input.send(text);
    }, [input]);

    const value: BrainContextValue = {
        brain,
        input,
        sendMessage,
    };

    return (
        <BrainContext.Provider value={value}>
            {children}
        </BrainContext.Provider>
    );
}

export function useBrainContext(): BrainContextValue {
    const context = useContext(BrainContext);
    if (!context) {
        throw new Error('useBrainContext must be used within a BrainProvider');
    }
    return context;
}
