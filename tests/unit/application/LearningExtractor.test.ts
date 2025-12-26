import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createLearningExtractor,
  type LearningExtractor
} from '../../../src/application/LearningExtractor'
import type { ModelClient } from '../../../src/domain/ports/ModelClient'
import type { LearningService } from '../../../src/application/LearningService'
import type { Message } from '../../../src/domain/models/Message'

function createMockModelClient(): ModelClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    loadModel: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn().mockResolvedValue('[]'),
    unloadModel: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(true),
    isModelLoaded: vi.fn().mockReturnValue(true)
  }
}

function createMockLearningService(): LearningService {
  return {
    addLearning: vi.fn().mockResolvedValue({
      id: 'test-123',
      content: 'Test',
      category: 'preference',
      createdAt: new Date()
    }),
    removeLearning: vi.fn(),
    clearLearnings: vi.fn(),
    getLearnings: vi.fn().mockResolvedValue([]),
    getLearning: vi.fn(),
    getLearningsByCategory: vi.fn()
  }
}

function createMessage(role: 'user' | 'assistant' | 'system', content: string): Message {
  return {
    role,
    content,
    timestamp: new Date()
  }
}

describe('LearningExtractor', () => {
  let mockModelClient: ModelClient
  let mockLearningService: LearningService
  let extractor: LearningExtractor

  beforeEach(() => {
    mockModelClient = createMockModelClient()
    mockLearningService = createMockLearningService()
    extractor = createLearningExtractor(mockModelClient, mockLearningService)
  })

  describe('extract', () => {
    it('should not extract when conversation is empty', async () => {
      await extractor.extract([])

      expect(mockModelClient.generate).not.toHaveBeenCalled()
      expect(mockLearningService.addLearning).not.toHaveBeenCalled()
    })

    it('should not extract when only system message exists', async () => {
      const messages = [createMessage('system', 'You are Albert.')]

      await extractor.extract(messages)

      expect(mockModelClient.generate).not.toHaveBeenCalled()
    })

    it('should call model to extract learnings from conversation', async () => {
      const messages = [
        createMessage('user', 'I prefer TypeScript over JavaScript'),
        createMessage('assistant', 'TypeScript is a great choice!')
      ]
      vi.mocked(mockModelClient.generate).mockResolvedValue('[]')

      await extractor.extract(messages)

      expect(mockModelClient.generate).toHaveBeenCalled()
      const callArgs = vi.mocked(mockModelClient.generate).mock.calls[0]
      const promptMessages = callArgs[0]
      expect(promptMessages[0].role).toBe('system')
      expect(promptMessages[0].content).toContain('extract')
    })

    it('should save extracted learnings', async () => {
      const messages = [
        createMessage('user', 'My name is John and I work at Acme'),
        createMessage('assistant', 'Nice to meet you, John!')
      ]
      vi.mocked(mockModelClient.generate).mockResolvedValue(
        JSON.stringify([
          { content: 'User name is John', category: 'fact' },
          { content: 'User works at Acme', category: 'fact' }
        ])
      )

      await extractor.extract(messages)

      expect(mockLearningService.addLearning).toHaveBeenCalledTimes(2)
      expect(mockLearningService.addLearning).toHaveBeenCalledWith('User name is John', 'fact')
      expect(mockLearningService.addLearning).toHaveBeenCalledWith('User works at Acme', 'fact')
    })

    it('should handle empty learning array from model', async () => {
      const messages = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi there!')
      ]
      vi.mocked(mockModelClient.generate).mockResolvedValue('[]')

      await extractor.extract(messages)

      expect(mockLearningService.addLearning).not.toHaveBeenCalled()
    })

    it('should handle malformed JSON from model', async () => {
      const messages = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi!')
      ]
      vi.mocked(mockModelClient.generate).mockResolvedValue('not valid json')

      await expect(extractor.extract(messages)).resolves.not.toThrow()
      expect(mockLearningService.addLearning).not.toHaveBeenCalled()
    })

    it('should default category to preference when not specified', async () => {
      const messages = [
        createMessage('user', 'I like dark mode'),
        createMessage('assistant', 'Noted!')
      ]
      vi.mocked(mockModelClient.generate).mockResolvedValue(
        JSON.stringify([{ content: 'User prefers dark mode' }])
      )

      await extractor.extract(messages)

      expect(mockLearningService.addLearning).toHaveBeenCalledWith(
        'User prefers dark mode',
        'preference'
      )
    })

    it('should skip learnings with empty content', async () => {
      const messages = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi!')
      ]
      vi.mocked(mockModelClient.generate).mockResolvedValue(
        JSON.stringify([
          { content: '', category: 'fact' },
          { content: 'Valid content', category: 'preference' }
        ])
      )

      await extractor.extract(messages)

      expect(mockLearningService.addLearning).toHaveBeenCalledTimes(1)
      expect(mockLearningService.addLearning).toHaveBeenCalledWith('Valid content', 'preference')
    })

    it('should include conversation in extraction prompt', async () => {
      const messages = [
        createMessage('user', 'I prefer tabs over spaces'),
        createMessage('assistant', 'Tabs are a valid choice!')
      ]
      vi.mocked(mockModelClient.generate).mockResolvedValue('[]')

      await extractor.extract(messages)

      const callArgs = vi.mocked(mockModelClient.generate).mock.calls[0]
      const systemMessage = callArgs[0].find((m: any) => m.role === 'system')
      expect(systemMessage).toBeDefined()
    })

    it('should handle model errors gracefully', async () => {
      const messages = [
        createMessage('user', 'Hello'),
        createMessage('assistant', 'Hi!')
      ]
      vi.mocked(mockModelClient.generate).mockRejectedValue(new Error('Model error'))

      await expect(extractor.extract(messages)).resolves.not.toThrow()
      expect(mockLearningService.addLearning).not.toHaveBeenCalled()
    })

    it('should validate category values', async () => {
      const messages = [
        createMessage('user', 'Test'),
        createMessage('assistant', 'Test')
      ]
      vi.mocked(mockModelClient.generate).mockResolvedValue(
        JSON.stringify([
          { content: 'Valid preference', category: 'preference' },
          { content: 'Valid fact', category: 'fact' },
          { content: 'Invalid category', category: 'invalid' }
        ])
      )

      await extractor.extract(messages)

      expect(mockLearningService.addLearning).toHaveBeenCalledTimes(3)
      expect(mockLearningService.addLearning).toHaveBeenCalledWith('Invalid category', 'preference')
    })
  })
})
