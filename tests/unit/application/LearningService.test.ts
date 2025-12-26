import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createLearningService,
  type LearningService
} from '../../../src/application/LearningService'
import type { LearningRepository } from '../../../src/domain/ports/LearningRepository'
import type { Learning, LearningCategory } from '../../../src/domain/models/Learning'

function createMockRepository(): LearningRepository {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(null),
    findAll: vi.fn().mockResolvedValue([]),
    remove: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(undefined)
  }
}

function createFakeLearning(
  id: string,
  content: string,
  category: LearningCategory = 'preference'
): Learning {
  return {
    id,
    content,
    category,
    createdAt: new Date()
  }
}

describe('LearningService', () => {
  let repository: LearningRepository
  let service: LearningService

  beforeEach(() => {
    repository = createMockRepository()
    service = createLearningService(repository)
  })

  describe('addLearning', () => {
    it('should create and save a learning', async () => {
      const result = await service.addLearning('User prefers TypeScript')

      expect(result.content).toBe('User prefers TypeScript')
      expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
        content: 'User prefers TypeScript'
      }))
    })

    it('should return the created learning', async () => {
      const result = await service.addLearning('Test content')

      expect(result.id).toBeDefined()
      expect(result.category).toBe('preference')
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should accept custom category', async () => {
      const result = await service.addLearning('Works at Acme Corp', 'fact')

      expect(result.category).toBe('fact')
    })
  })

  describe('removeLearning', () => {
    it('should remove learning by id', async () => {
      vi.mocked(repository.remove).mockResolvedValue(true)

      const result = await service.removeLearning('learning-123')

      expect(repository.remove).toHaveBeenCalledWith('learning-123')
      expect(result).toBe(true)
    })

    it('should return false when learning not found', async () => {
      vi.mocked(repository.remove).mockResolvedValue(false)

      const result = await service.removeLearning('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('clearLearnings', () => {
    it('should clear all learnings', async () => {
      await service.clearLearnings()

      expect(repository.clear).toHaveBeenCalled()
    })
  })

  describe('getLearnings', () => {
    it('should return all learnings', async () => {
      const learnings = [
        createFakeLearning('1', 'First'),
        createFakeLearning('2', 'Second')
      ]
      vi.mocked(repository.findAll).mockResolvedValue(learnings)

      const result = await service.getLearnings()

      expect(result).toEqual(learnings)
    })

    it('should return empty array when no learnings', async () => {
      vi.mocked(repository.findAll).mockResolvedValue([])

      const result = await service.getLearnings()

      expect(result).toEqual([])
    })
  })

  describe('getLearning', () => {
    it('should return learning by id', async () => {
      const learning = createFakeLearning('123', 'Test')
      vi.mocked(repository.findById).mockResolvedValue(learning)

      const result = await service.getLearning('123')

      expect(result).toEqual(learning)
      expect(repository.findById).toHaveBeenCalledWith('123')
    })

    it('should return null when not found', async () => {
      vi.mocked(repository.findById).mockResolvedValue(null)

      const result = await service.getLearning('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getLearningsByCategory', () => {
    it('should filter learnings by category', async () => {
      const learnings = [
        createFakeLearning('1', 'Preference 1', 'preference'),
        createFakeLearning('2', 'Fact 1', 'fact'),
        createFakeLearning('3', 'Preference 2', 'preference')
      ]
      vi.mocked(repository.findAll).mockResolvedValue(learnings)

      const result = await service.getLearningsByCategory('preference')

      expect(result).toHaveLength(2)
      expect(result.every(l => l.category === 'preference')).toBe(true)
    })

    it('should return empty array when no learnings match category', async () => {
      const learnings = [createFakeLearning('1', 'Preference 1', 'preference')]
      vi.mocked(repository.findAll).mockResolvedValue(learnings)

      const result = await service.getLearningsByCategory('fact')

      expect(result).toEqual([])
    })
  })
})
