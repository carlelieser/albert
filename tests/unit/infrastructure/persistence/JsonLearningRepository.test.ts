import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createJsonLearningRepository } from '../../../../src/infrastructure/persistence/JsonLearningRepository'
import type { FileSystem } from '../../../../src/domain/ports/FileSystem'
import type { Learning } from '../../../../src/domain/models/Learning'

describe('JsonLearningRepository', () => {
  const mockFileSystem: FileSystem = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    mkdir: vi.fn()
  }

  const sampleLearning: Learning = {
    id: 'learning-1',
    content: 'User prefers TypeScript',
    category: 'preference',
    createdAt: new Date('2024-01-15T10:00:00Z')
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findAll', () => {
    it('should return empty array when file does not exist', async () => {
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(false)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      const learnings = await repo.findAll()

      expect(learnings).toEqual([])
    })

    it('should return learnings from file', async () => {
      const fileContent = JSON.stringify({
        version: 1,
        learnings: [{
          id: 'learning-1',
          content: 'User prefers TypeScript',
          category: 'preference',
          createdAt: '2024-01-15T10:00:00.000Z'
        }]
      })
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(fileContent)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      const learnings = await repo.findAll()

      expect(learnings).toHaveLength(1)
      expect(learnings[0].id).toBe('learning-1')
      expect(learnings[0].content).toBe('User prefers TypeScript')
      expect(learnings[0].category).toBe('preference')
      expect(learnings[0].createdAt).toBeInstanceOf(Date)
    })

    it('should return empty array for empty learnings', async () => {
      const fileContent = JSON.stringify({ version: 1, learnings: [] })
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(fileContent)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      const learnings = await repo.findAll()

      expect(learnings).toEqual([])
    })
  })

  describe('findById', () => {
    it('should return null when learning not found', async () => {
      const fileContent = JSON.stringify({ version: 1, learnings: [] })
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(fileContent)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      const learning = await repo.findById('nonexistent')

      expect(learning).toBeNull()
    })

    it('should return learning when found', async () => {
      const fileContent = JSON.stringify({
        version: 1,
        learnings: [{
          id: 'learning-1',
          content: 'User prefers TypeScript',
          category: 'preference',
          createdAt: '2024-01-15T10:00:00.000Z'
        }]
      })
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(fileContent)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      const learning = await repo.findById('learning-1')

      expect(learning).not.toBeNull()
      expect(learning!.id).toBe('learning-1')
    })
  })

  describe('save', () => {
    it('should create directory if not exists', async () => {
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(false)
      vi.mocked(mockFileSystem.writeFile).mockResolvedValueOnce(undefined)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      await repo.save(sampleLearning)

      expect(mockFileSystem.mkdir).toHaveBeenCalledWith('/data')
    })

    it('should write learning to file', async () => {
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(false)
      vi.mocked(mockFileSystem.writeFile).mockResolvedValueOnce(undefined)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      await repo.save(sampleLearning)

      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        '/data/learnings.json',
        expect.stringContaining('"version": 1')
      )
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        '/data/learnings.json',
        expect.stringContaining('"learnings"')
      )
    })

    it('should append to existing learnings', async () => {
      const existingContent = JSON.stringify({
        version: 1,
        learnings: [{
          id: 'existing-1',
          content: 'Existing learning',
          category: 'fact',
          createdAt: '2024-01-01T00:00:00.000Z'
        }]
      })
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(existingContent)
      vi.mocked(mockFileSystem.writeFile).mockResolvedValueOnce(undefined)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      await repo.save(sampleLearning)

      const writeCall = vi.mocked(mockFileSystem.writeFile).mock.calls[0]
      const written = JSON.parse(writeCall[1])
      expect(written.learnings).toHaveLength(2)
    })
  })

  describe('remove', () => {
    it('should return false when learning not found', async () => {
      const fileContent = JSON.stringify({ version: 1, learnings: [] })
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(fileContent)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      const result = await repo.remove('nonexistent')

      expect(result).toBe(false)
    })

    it('should remove learning and return true', async () => {
      const fileContent = JSON.stringify({
        version: 1,
        learnings: [{
          id: 'learning-1',
          content: 'To be removed',
          category: 'preference',
          createdAt: '2024-01-15T10:00:00.000Z'
        }]
      })
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(fileContent)
      vi.mocked(mockFileSystem.writeFile).mockResolvedValueOnce(undefined)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      const result = await repo.remove('learning-1')

      expect(result).toBe(true)
      const writeCall = vi.mocked(mockFileSystem.writeFile).mock.calls[0]
      const written = JSON.parse(writeCall[1])
      expect(written.learnings).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('should remove all learnings', async () => {
      const fileContent = JSON.stringify({
        version: 1,
        learnings: [
          { id: '1', content: 'First', category: 'fact', createdAt: '2024-01-01T00:00:00.000Z' },
          { id: '2', content: 'Second', category: 'fact', createdAt: '2024-01-02T00:00:00.000Z' }
        ]
      })
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(fileContent)
      vi.mocked(mockFileSystem.writeFile).mockResolvedValueOnce(undefined)

      const repo = createJsonLearningRepository(mockFileSystem, '/data/learnings.json')
      await repo.clear()

      const writeCall = vi.mocked(mockFileSystem.writeFile).mock.calls[0]
      const written = JSON.parse(writeCall[1])
      expect(written.learnings).toHaveLength(0)
    })
  })
})
