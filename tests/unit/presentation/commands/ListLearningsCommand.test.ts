import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createListLearningsCommand } from '../../../../src/presentation/commands/ListLearningsCommand'
import type { LearningService } from '../../../../src/application/LearningService'
import type { Learning } from '../../../../src/domain/models/Learning'

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

function createFakeLearning(id: string, content: string): Learning {
  return {
    id,
    content,
    category: 'preference',
    createdAt: new Date('2024-01-15T10:00:00Z')
  }
}

describe('ListLearningsCommand', () => {
  let learningService: LearningService

  beforeEach(() => {
    learningService = createMockLearningService()
  })

  it('should have name "learnings"', () => {
    const command = createListLearningsCommand(learningService)

    expect(command.name).toBe('learnings')
  })

  describe('execute', () => {
    it('should call getLearnings', async () => {
      const command = createListLearningsCommand(learningService)

      await command.execute('')

      expect(learningService.getLearnings).toHaveBeenCalled()
    })

    it('should return message when no learnings', async () => {
      vi.mocked(learningService.getLearnings).mockResolvedValue([])
      const command = createListLearningsCommand(learningService)

      const result = await command.execute('')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('No learnings')
    })

    it('should list learnings with ids', async () => {
      const learnings = [
        createFakeLearning('abc-123', 'User prefers TypeScript'),
        createFakeLearning('def-456', 'User likes concise code')
      ]
      vi.mocked(learningService.getLearnings).mockResolvedValue(learnings)
      const command = createListLearningsCommand(learningService)

      const result = await command.execute('')

      expect(result.handled).toBe(true)
      expect(result.output).toContain('abc-123')
      expect(result.output).toContain('User prefers TypeScript')
      expect(result.output).toContain('def-456')
      expect(result.output).toContain('User likes concise code')
    })

    it('should include count of learnings', async () => {
      const learnings = [
        createFakeLearning('1', 'First'),
        createFakeLearning('2', 'Second'),
        createFakeLearning('3', 'Third')
      ]
      vi.mocked(learningService.getLearnings).mockResolvedValue(learnings)
      const command = createListLearningsCommand(learningService)

      const result = await command.execute('')

      expect(result.output).toContain('3')
    })
  })
})
