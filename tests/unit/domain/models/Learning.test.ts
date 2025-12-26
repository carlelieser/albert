import { describe, it, expect } from 'vitest'
import {
  createLearning,
  type Learning,
  type LearningCategory
} from '../../../../src/domain/models/Learning'

describe('Learning', () => {
  describe('createLearning', () => {
    it('should create learning with content', () => {
      const learning = createLearning('User prefers TypeScript')

      expect(learning.content).toBe('User prefers TypeScript')
    })

    it('should generate unique id', () => {
      const learning1 = createLearning('First learning')
      const learning2 = createLearning('Second learning')

      expect(learning1.id).toBeDefined()
      expect(learning2.id).toBeDefined()
      expect(learning1.id).not.toBe(learning2.id)
    })

    it('should default category to preference', () => {
      const learning = createLearning('User likes concise answers')

      expect(learning.category).toBe('preference')
    })

    it('should accept custom category', () => {
      const learning = createLearning('Works at Acme Corp', 'fact')

      expect(learning.category).toBe('fact')
    })

    it('should set createdAt timestamp', () => {
      const before = new Date()
      const learning = createLearning('Some learning')
      const after = new Date()

      expect(learning.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(learning.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should support all category types', () => {
      const categories: LearningCategory[] = ['preference', 'fact', 'style', 'correction']

      categories.forEach(category => {
        const learning = createLearning('Test content', category)
        expect(learning.category).toBe(category)
      })
    })

    it('should trim whitespace from content', () => {
      const learning = createLearning('  User prefers tabs  ')

      expect(learning.content).toBe('User prefers tabs')
    })

    it('should be immutable', () => {
      const learning = createLearning('Original content')

      expect(Object.isFrozen(learning)).toBe(true)
    })
  })
})
