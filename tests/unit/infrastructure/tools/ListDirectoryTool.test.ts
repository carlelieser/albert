import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createListDirectoryTool } from '../../../../src/infrastructure/tools/ListDirectoryTool'
import { writeFileSync, mkdirSync, rmdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

describe('ListDirectoryTool', () => {
  const listDirTool = createListDirectoryTool()
  const testDir = join(tmpdir(), 'albert-test-listdir')
  const subDir = join(testDir, 'subdir')

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true })
    mkdirSync(subDir, { recursive: true })
    writeFileSync(join(testDir, 'file1.txt'), 'content1')
    writeFileSync(join(testDir, 'file2.txt'), 'content2')
    writeFileSync(join(subDir, 'nested.txt'), 'nested')
  })

  afterAll(() => {
    try {
      unlinkSync(join(subDir, 'nested.txt'))
      unlinkSync(join(testDir, 'file1.txt'))
      unlinkSync(join(testDir, 'file2.txt'))
      rmdirSync(subDir)
      rmdirSync(testDir)
    } catch {
      // ignore cleanup errors
    }
  })

  describe('definition', () => {
    it('should have correct name', () => {
      expect(listDirTool.definition.name).toBe('list_directory')
    })

    it('should have path parameter', () => {
      const pathParam = listDirTool.definition.parameters.find(p => p.name === 'path')
      expect(pathParam).toBeDefined()
      expect(pathParam?.required).toBe(true)
    })

    it('should have optional recursive parameter', () => {
      const recursiveParam = listDirTool.definition.parameters.find(p => p.name === 'recursive')
      expect(recursiveParam).toBeDefined()
      expect(recursiveParam?.required).toBe(false)
      expect(recursiveParam?.defaultValue).toBe(false)
    })
  })

  describe('execute', () => {
    it('should list directory contents', async () => {
      const result = await listDirTool.execute({ path: testDir })

      expect(result.success).toBe(true)
      expect(result.output).toContain('file1.txt')
      expect(result.output).toContain('file2.txt')
      expect(result.output).toContain('subdir')
    })

    it('should list only top-level by default', async () => {
      const result = await listDirTool.execute({ path: testDir })

      expect(result.success).toBe(true)
      expect(result.output).not.toContain('nested.txt')
    })

    it('should list recursively when specified', async () => {
      const result = await listDirTool.execute({ path: testDir, recursive: true })

      expect(result.success).toBe(true)
      expect(result.output).toContain('nested.txt')
    })

    it('should return error for nonexistent directory', async () => {
      const result = await listDirTool.execute({ path: '/nonexistent_dir_xyz' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return error when path is a file', async () => {
      const result = await listDirTool.execute({ path: join(testDir, 'file1.txt') })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not a directory')
    })
  })
})
