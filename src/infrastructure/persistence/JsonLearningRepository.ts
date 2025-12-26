import path from 'node:path'
import type { FileSystem } from '../../domain/ports/FileSystem'
import type { LearningRepository } from '../../domain/ports/LearningRepository'
import type { Learning, LearningCategory } from '../../domain/models/Learning'

interface StoredLearning {
  id: string
  content: string
  category: LearningCategory
  createdAt: string
}

interface LearningsFile {
  version: number
  learnings: StoredLearning[]
}

function toLearning(stored: StoredLearning): Learning {
  return Object.freeze({
    id: stored.id,
    content: stored.content,
    category: stored.category,
    createdAt: new Date(stored.createdAt)
  })
}

function toStoredLearning(learning: Learning): StoredLearning {
  return {
    id: learning.id,
    content: learning.content,
    category: learning.category,
    createdAt: learning.createdAt.toISOString()
  }
}

export function createJsonLearningRepository(
  fileSystem: FileSystem,
  filePath: string
): LearningRepository {
  async function readLearnings(): Promise<StoredLearning[]> {
    const exists = await fileSystem.exists(filePath)
    if (!exists) {
      return []
    }

    const content = await fileSystem.readFile(filePath)
    const data: LearningsFile = JSON.parse(content)
    return data.learnings
  }

  async function writeLearnings(learnings: StoredLearning[]): Promise<void> {
    const directory = path.dirname(filePath)
    await fileSystem.mkdir(directory)

    const data: LearningsFile = {
      version: 1,
      learnings
    }
    await fileSystem.writeFile(filePath, JSON.stringify(data, null, 2))
  }

  return {
    async findAll(): Promise<Learning[]> {
      const stored = await readLearnings()
      return stored.map(toLearning)
    },

    async findById(id: string): Promise<Learning | null> {
      const stored = await readLearnings()
      const found = stored.find(l => l.id === id)
      return found ? toLearning(found) : null
    },

    async save(learning: Learning): Promise<void> {
      const stored = await readLearnings()
      const existingIndex = stored.findIndex(l => l.id === learning.id)

      if (existingIndex >= 0) {
        stored[existingIndex] = toStoredLearning(learning)
      } else {
        stored.push(toStoredLearning(learning))
      }

      await writeLearnings(stored)
    },

    async remove(id: string): Promise<boolean> {
      const stored = await readLearnings()
      const index = stored.findIndex(l => l.id === id)

      if (index < 0) {
        return false
      }

      stored.splice(index, 1)
      await writeLearnings(stored)
      return true
    },

    async clear(): Promise<void> {
      await writeLearnings([])
    }
  }
}
