import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  mkdir: vi.fn()
}))

import * as fs from 'node:fs/promises'
import { createNodeFileSystem } from '../../../../src/infrastructure/filesystem/NodeFileSystem'

describe('NodeFileSystem', () => {
  const mockFs = vi.mocked(fs)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('readFile', () => {
    it('should read file content as string', async () => {
      mockFs.readFile.mockResolvedValueOnce('file content')

      const fs = createNodeFileSystem()
      const content = await fs.readFile('/path/to/file.txt')

      expect(content).toBe('file content')
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8')
    })

    it('should throw error when file does not exist', async () => {
      const error = new Error('ENOENT: no such file or directory')
      mockFs.readFile.mockRejectedValueOnce(error)

      const fs = createNodeFileSystem()

      await expect(fs.readFile('/nonexistent.txt')).rejects.toThrow('ENOENT')
    })
  })

  describe('writeFile', () => {
    it('should write content to file', async () => {
      mockFs.writeFile.mockResolvedValueOnce(undefined)

      const fs = createNodeFileSystem()
      await fs.writeFile('/path/to/file.txt', 'new content')

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/path/to/file.txt',
        'new content',
        'utf-8'
      )
    })

    it('should throw error on write failure', async () => {
      const error = new Error('EACCES: permission denied')
      mockFs.writeFile.mockRejectedValueOnce(error)

      const fs = createNodeFileSystem()

      await expect(fs.writeFile('/readonly.txt', 'content')).rejects.toThrow('EACCES')
    })
  })

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockFs.access.mockResolvedValueOnce(undefined)

      const fs = createNodeFileSystem()
      const exists = await fs.exists('/existing/file.txt')

      expect(exists).toBe(true)
      expect(mockFs.access).toHaveBeenCalledWith('/existing/file.txt')
    })

    it('should return false when file does not exist', async () => {
      mockFs.access.mockRejectedValueOnce(new Error('ENOENT'))

      const fs = createNodeFileSystem()
      const exists = await fs.exists('/nonexistent.txt')

      expect(exists).toBe(false)
    })
  })

  describe('mkdir', () => {
    it('should create directory recursively', async () => {
      mockFs.mkdir.mockResolvedValueOnce(undefined)

      const fs = createNodeFileSystem()
      await fs.mkdir('/path/to/new/directory')

      expect(mockFs.mkdir).toHaveBeenCalledWith('/path/to/new/directory', { recursive: true })
    })

    it('should not throw if directory already exists', async () => {
      mockFs.mkdir.mockResolvedValueOnce(undefined)

      const fs = createNodeFileSystem()

      await expect(fs.mkdir('/existing/directory')).resolves.not.toThrow()
    })
  })
})
