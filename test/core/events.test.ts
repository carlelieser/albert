import { describe, it, expect } from 'vitest';
import { Events } from '../../src/core/events';

describe('Events', () => {
    it('should define InputReceived event', () => {
        expect(Events.InputReceived).toBe('input_received');
    });

    it('should define KnowledgeQuery event', () => {
        expect(Events.KnowledgeQuery).toBe('knowledge_query');
    });

    it('should define KnowledgeResult event', () => {
        expect(Events.KnowledgeResult).toBe('knowledge_result');
    });

    it('should define KnowledgeStore event', () => {
        expect(Events.KnowledgeStore).toBe('knowledge_store');
    });

    it('should define MemoryQuery event', () => {
        expect(Events.MemoryQuery).toBe('memory_query');
    });

    it('should define MemoryResult event', () => {
        expect(Events.MemoryResult).toBe('memory_result');
    });

    it('should define MemoryStore event', () => {
        expect(Events.MemoryStore).toBe('memory_store');
    });

    it('should define PersonalityQuery event', () => {
        expect(Events.PersonalityQuery).toBe('personality_query');
    });

    it('should define PersonalityResult event', () => {
        expect(Events.PersonalityResult).toBe('personality_result');
    });

    it('should define PersonalityAdjust event', () => {
        expect(Events.PersonalityAdjust).toBe('personality_adjust');
    });

    it('should define OutputReady event', () => {
        expect(Events.OutputReady).toBe('output_ready');
    });

    it('should define CoreStarted event', () => {
        expect(Events.CoreStarted).toBe('core_started');
    });

    it('should define CoreStopped event', () => {
        expect(Events.CoreStopped).toBe('core_stopped');
    });
});
