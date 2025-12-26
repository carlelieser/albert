import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createForgetCommand } from '../../../../src/presentation/commands/ForgetCommand'
import type { LearningService } from '../../../../src/application/LearningService'

function createMockLearningService(): LearningService {
  return {
    addLearning: vi.fn().mockResolvedValue({
      id: 'test-123',
      content: 'Test content',
      category: 'preference',
      createdAt: new Date()
    }),
    removeLearning: vi.fn().mockResolvedValue(true),
    clearLearnings: vi.fn().mockResolvedValue(undefined),
    getLearnings: vi.fn().mockResolvedValue([]),
    getLearning: vi.fn().mockResolvedValue(null)
  }
}

describe('ForgetCommand', () => {
  let learningService: LearningService

  beforeEach(() => {
    learningService = createMockLearningService()
  })

  it('should have name "forget"', () => {
    const command = createForgetCommand(learningService)

    expect(command.name).toBe('forget')
  })

  describe('execute with id', () => {
    it('should remove learning by id', async () => {
      vi.mocked(learningService.removeLearning).mockResolvedValue(true)
      const command = createForgetCommand(learningService)

      await command.execute('learning-123')

      expect(learningService.removeLearning).toHaveBeenCalledWith('learning-123')
    })

    it('should return confirmation when removed', async () => {
      vi.mocked(learningService.removeLearning).mockResolvedValue(true)
      const command = createForgetCommand(learningService)

      const result = await command.execute('learning-123')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('Forgotten')
    })

    it('should return error when learning not found', async () => {
      vi.mocked(learningService.removeLearning).mockResolvedValue(false)
      const command = createForgetCommand(learningService)

      const result = await command.execute('non-existent')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('not found')
    })
  })

  describe('execute with "all"', () => {
    it('should clear all learnings', async () => {
      const command = createForgetCommand(learningService)

      await command.execute('all')

      expect(learningService.clearLearnings).toHaveBeenCalled()
    })

    it('should be case insensitive for "all"', async () => {
      const command = createForgetCommand(learningService)

      await command.execute('ALL')

      expect(learningService.clearLearnings).toHaveBeenCalled()
    })

    it('should return confirmation when cleared', async () => {
      const command = createForgetCommand(learningService)

      const result = await command.execute('all')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('Forgotten all learnings')
    })
  })

  describe('execute with no arguments', () => {
    it('should return usage message', async () => {
      const command = createForgetCommand(learningService)

      const result = await command.execute('')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('Usage')
      expect(learningService.removeLearning).not.toHaveBeenCalled()
      expect(learningService.clearLearnings).not.toHaveBeenCalled()
    })
  })
})
