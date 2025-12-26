import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createReadFileTool } from '../../../../src/infrastructure/tools/ReadFileTool'
import { writeFileSync, unlinkSync, mkdirSync, rmdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('ReadFileTool', () => {
  const readFileTool = createReadFileTool()
  const testDir = join(tmpdir(), 'albert-test-read')
  const testFile = join(testDir, 'test.txt')
  const testContent = 'Hello, Albert!'

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true })
    writeFileSync(testFile, testContent)
  })

  afterAll(() => {
    try {
      unlinkSync(testFile)
      rmdirSync(testDir)
    } catch {
      // ignore cleanup errors
    }
  })

  describe('definition', () => {
    it('should have correct name', () => {
      expect(readFileTool.definition.name).toBe('read_file')
    })

    it('should have path parameter', () => {
      const pathParam = readFileTool.definition.parameters.find(p => p.name === 'path')
      expect(pathParam).toBeDefined()
      expect(pathParam?.required).toBe(true)
    })

    it('should have optional encoding parameter', () => {
      const encodingParam = readFileTool.definition.parameters.find(p => p.name === 'encoding')
      expect(encodingParam).toBeDefined()
      expect(encodingParam?.required).toBe(false)
      expect(encodingParam?.defaultValue).toBe('utf-8')
    })
  })

  describe('execute', () => {
    it('should read file contents', async () => {
      const result = await readFileTool.execute({ path: testFile })

      expect(result.success).toBe(true)
      expect(result.output).toBe(testContent)
    })

    it('should return error for nonexistent file', async () => {
      const result = await readFileTool.execute({ path: '/nonexistent/file.txt' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
