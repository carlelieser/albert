import { useState, useCallback, useEffect, useMemo } from 'react';

interface UseScrollableOptions {
    itemCount: number;
    viewportHeight: number;
    itemHeight?: number;
    autoScrollToBottom?: boolean;
}

interface UseScrollableReturn {
    scrollOffset: number;
    visibleRange: { start: number; end: number };
    scrollUp: () => void;
    scrollDown: () => void;
    scrollToTop: () => void;
    scrollToBottom: () => void;
    setScrollOffset: (offset: number) => void;
    isAtBottom: boolean;
    isAtTop: boolean;
    maxOffset: number;
}

export function useScrollable({
    itemCount,
    viewportHeight,
    itemHeight = 1,
    autoScrollToBottom = true,
}: UseScrollableOptions): UseScrollableReturn {
    const [scrollOffset, setScrollOffset] = useState(0);
    const [userScrolled, setUserScrolled] = useState(false);

    const maxOffset = useMemo(() => {
        const totalHeight = itemCount * itemHeight;
        return Math.max(0, totalHeight - viewportHeight);
    }, [itemCount, itemHeight, viewportHeight]);

    const isAtBottom = scrollOffset >= maxOffset;
    const isAtTop = scrollOffset <= 0;

    const visibleRange = useMemo(() => {
        const start = Math.floor(scrollOffset / itemHeight);
        const end = Math.min(itemCount, start + Math.ceil(viewportHeight / itemHeight) + 1);
        return { start: Math.max(0, start), end };
    }, [scrollOffset, itemHeight, viewportHeight, itemCount]);

    const scrollUp = useCallback(() => {
        setUserScrolled(true);
        setScrollOffset(prev => Math.max(0, prev - itemHeight));
    }, [itemHeight]);

    const scrollDown = useCallback(() => {
        setScrollOffset(prev => Math.min(maxOffset, prev + itemHeight));
        if (scrollOffset + itemHeight >= maxOffset) {
            setUserScrolled(false);
        }
    }, [itemHeight, maxOffset, scrollOffset]);

    const scrollToTop = useCallback(() => {
        setUserScrolled(true);
        setScrollOffset(0);
    }, []);

    const scrollToBottom = useCallback(() => {
        setUserScrolled(false);
        setScrollOffset(maxOffset);
    }, [maxOffset]);

    // Auto-scroll to bottom when new items are added
    useEffect(() => {
        if (autoScrollToBottom && !userScrolled) {
            setScrollOffset(maxOffset);
        }
    }, [autoScrollToBottom, userScrolled, maxOffset]);

    return {
        scrollOffset,
        visibleRange,
        scrollUp,
        scrollDown,
        scrollToTop,
        scrollToBottom,
        setScrollOffset,
        isAtBottom,
        isAtTop,
        maxOffset,
    };
}
