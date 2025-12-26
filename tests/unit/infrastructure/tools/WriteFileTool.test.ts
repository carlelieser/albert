import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createWriteFileTool } from '../../../../src/infrastructure/tools/WriteFileTool'
import { readFileSync, unlinkSync, mkdirSync, rmdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('WriteFileTool', () => {
  const writeFileTool = createWriteFileTool()
  const testDir = join(tmpdir(), 'albert-test-write')
  const testFile = join(testDir, 'output.txt')

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterAll(() => {
    try {
      if (existsSync(testFile)) unlinkSync(testFile)
      rmdirSync(testDir)
    } catch {
      // ignore cleanup errors
    }
  })

  describe('definition', () => {
    it('should have correct name', () => {
      expect(writeFileTool.definition.name).toBe('write_file')
    })

    it('should have path parameter', () => {
      const pathParam = writeFileTool.definition.parameters.find(p => p.name === 'path')
      expect(pathParam).toBeDefined()
      expect(pathParam?.required).toBe(true)
    })

    it('should have content parameter', () => {
      const contentParam = writeFileTool.definition.parameters.find(p => p.name === 'content')
      expect(contentParam).toBeDefined()
      expect(contentParam?.required).toBe(true)
    })
  })

  describe('execute', () => {
    it('should write content to file', async () => {
      const content = 'Test content from Albert'
      const result = await writeFileTool.execute({ path: testFile, content })

      expect(result.success).toBe(true)
      expect(readFileSync(testFile, 'utf-8')).toBe(content)
    })

    it('should overwrite existing file', async () => {
      await writeFileTool.execute({ path: testFile, content: 'First' })
      const result = await writeFileTool.execute({ path: testFile, content: 'Second' })

      expect(result.success).toBe(true)
      expect(readFileSync(testFile, 'utf-8')).toBe('Second')
    })

    it('should return error for invalid path', async () => {
      const result = await writeFileTool.execute({
        path: '/nonexistent_dir_xyz/file.txt',
        content: 'test'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
