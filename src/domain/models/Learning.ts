export type LearningCategory = 'preference' | 'fact' | 'style' | 'correction'

export interface Learning {
  readonly id: string
  readonly content: string
  readonly category: LearningCategory
  readonly createdAt: Date
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

export function createLearning(
  content: string,
  category: LearningCategory = 'preference'
): Learning {
  const learning: Learning = {
    id: generateId(),
    content: content.trim(),
    category,
    createdAt: new Date()
  }

  return Object.freeze(learning)
}
