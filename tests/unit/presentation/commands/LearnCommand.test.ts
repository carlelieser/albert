import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLearnCommand } from '../../../../src/presentation/commands/LearnCommand'
import type { LearningService } from '../../../../src/application/LearningService'
import type { Learning } from '../../../../src/domain/models/Learning'

function createMockLearningService(): LearningService {
  return {
    addLearning: vi.fn().mockResolvedValue({
      id: 'test-123',
      content: 'Test content',
      category: 'preference',
      createdAt: new Date()
    } as Learning),
    removeLearning: vi.fn().mockResolvedValue(true),
    clearLearnings: vi.fn().mockResolvedValue(undefined),
    getLearnings: vi.fn().mockResolvedValue([]),
    getLearning: vi.fn().mockResolvedValue(null)
  }
}

describe('LearnCommand', () => {
  let learningService: LearningService

  beforeEach(() => {
    learningService = createMockLearningService()
  })

  it('should have name "learn"', () => {
    const command = createLearnCommand(learningService)

    expect(command.name).toBe('learn')
  })

  describe('execute', () => {
    it('should call addLearning with content', async () => {
      const command = createLearnCommand(learningService)

      await command.execute('User prefers TypeScript')

      expect(learningService.addLearning).toHaveBeenCalledWith('User prefers TypeScript')
    })

    it('should return confirmation message', async () => {
      const command = createLearnCommand(learningService)

      const result = await command.execute('User prefers TypeScript')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('Learned')
    })

    it('should include learning content in confirmation', async () => {
      vi.mocked(learningService.addLearning).mockResolvedValue({
        id: '123',
        content: 'User likes concise code',
        category: 'preference',
        createdAt: new Date()
      })

      const command = createLearnCommand(learningService)
      const result = await command.execute('User likes concise code')

      expect(result.output).toContain('User likes concise code')
    })

    it('should return error when content is empty', async () => {
      const command = createLearnCommand(learningService)

      const result = await command.execute('')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('provide something to learn')
      expect(learningService.addLearning).not.toHaveBeenCalled()
    })

    it('should return error when content is only whitespace', async () => {
      const command = createLearnCommand(learningService)

      const result = await command.execute('   ')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('provide something to learn')
    })
  })
})
