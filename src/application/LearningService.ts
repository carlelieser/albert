import { createLearning, type Learning, type LearningCategory } from '../domain/models/Learning'
import type { LearningRepository } from '../domain/ports/LearningRepository'

export interface LearningService {
  addLearning(content: string, category?: LearningCategory): Promise<Learning>
  removeLearning(id: string): Promise<boolean>
  clearLearnings(): Promise<void>
  getLearnings(): Promise<Learning[]>
  getLearning(id: string): Promise<Learning | null>
  getLearningsByCategory(category: LearningCategory): Promise<Learning[]>
}

export function createLearningService(repository: LearningRepository): LearningService {
  return {
    async addLearning(content: string, category?: LearningCategory): Promise<Learning> {
      const learning = createLearning(content, category)
      await repository.save(learning)
      return learning
    },

    async removeLearning(id: string): Promise<boolean> {
      return repository.remove(id)
    },

    async clearLearnings(): Promise<void> {
      await repository.clear()
    },

    async getLearnings(): Promise<Learning[]> {
      return repository.findAll()
    },

    async getLearning(id: string): Promise<Learning | null> {
      return repository.findById(id)
    },

    async getLearningsByCategory(category: LearningCategory): Promise<Learning[]> {
      const allLearnings = await repository.findAll()
      return allLearnings.filter(learning => learning.category === category)
    }
  }
}
