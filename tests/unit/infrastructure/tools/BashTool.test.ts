import { describe, it, expect } from 'vitest'
import { createBashTool } from '../../../../src/infrastructure/tools/BashTool'

describe('BashTool', () => {
  const bashTool = createBashTool()

  describe('definition', () => {
    it('should have correct name', () => {
      expect(bashTool.definition.name).toBe('bash')
    })

    it('should have description', () => {
      expect(bashTool.definition.description).toContain('shell')
    })

    it('should have command parameter', () => {
      const commandParam = bashTool.definition.parameters.find(p => p.name === 'command')
      expect(commandParam).toBeDefined()
      expect(commandParam?.required).toBe(true)
      expect(commandParam?.type).toBe('string')
    })

    it('should have optional cwd parameter', () => {
      const cwdParam = bashTool.definition.parameters.find(p => p.name === 'cwd')
      expect(cwdParam).toBeDefined()
      expect(cwdParam?.required).toBe(false)
    })

    it('should have optional timeout parameter', () => {
      const timeoutParam = bashTool.definition.parameters.find(p => p.name === 'timeout')
      expect(timeoutParam).toBeDefined()
      expect(timeoutParam?.required).toBe(false)
      expect(timeoutParam?.defaultValue).toBe(30000)
    })
  })

  describe('execute', () => {
    it('should execute simple command', async () => {
      const result = await bashTool.execute({ command: 'echo hello' })

      expect(result.success).toBe(true)
      expect(result.output.trim()).toBe('hello')
    })

    it('should return error for failed command', async () => {
      const result = await bashTool.execute({ command: 'exit 1' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should return error for unknown command', async () => {
      const result = await bashTool.execute({ command: 'nonexistent_command_xyz' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should respect cwd parameter', async () => {
      const result = await bashTool.execute({ command: 'pwd', cwd: '/tmp' })

      expect(result.success).toBe(true)
      // macOS symlinks /tmp to /private/tmp
      expect(result.output.trim()).toMatch(/^(\/tmp|\/private\/tmp)$/)
    })

    it('should capture stderr in output on failure', async () => {
      const result = await bashTool.execute({ command: 'ls /nonexistent_path_xyz' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('No such file')
    })
  })
})
