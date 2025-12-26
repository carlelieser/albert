import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCommandRouter,
  type CommandRouter,
  type Command,
  type CommandResult
} from '../../../src/presentation/CommandRouter'

function createMockCommand(name: string, output: string = 'success'): Command {
  return {
    name,
    execute: vi.fn().mockResolvedValue({ handled: true, output })
  }
}

describe('CommandRouter', () => {
  let router: CommandRouter

  beforeEach(() => {
    router = createCommandRouter()
  })

  describe('isCommand', () => {
    it('should return true for input starting with /', () => {
      expect(router.isCommand('/learn')).toBe(true)
      expect(router.isCommand('/forget')).toBe(true)
      expect(router.isCommand('/learnings')).toBe(true)
    })

    it('should return false for regular input', () => {
      expect(router.isCommand('hello')).toBe(false)
      expect(router.isCommand('what is TypeScript?')).toBe(false)
    })

    it('should return false for empty input', () => {
      expect(router.isCommand('')).toBe(false)
      expect(router.isCommand('   ')).toBe(false)
    })

    it('should return true even with leading whitespace', () => {
      expect(router.isCommand('  /learn')).toBe(true)
    })
  })

  describe('register', () => {
    it('should register a command', () => {
      const command = createMockCommand('test')
      
      router.register(command)
      
      expect(router.isCommand('/test')).toBe(true)
    })
  })

  describe('execute', () => {
    it('should execute registered command', async () => {
      const command = createMockCommand('learn', 'Learning added!')
      router.register(command)

      const result = await router.execute('/learn something new')

      expect(result.handled).toBe(true)
      expect(result.output).toBe('Learning added!')
      expect(command.execute).toHaveBeenCalledWith('something new')
    })

    it('should return not handled for unregistered command', async () => {
      const result = await router.execute('/unknown')

      expect(result.handled).toBe(false)
      expect(result.output).toContain('Unknown command')
    })

    it('should parse command name correctly', async () => {
      const command = createMockCommand('test')
      router.register(command)

      await router.execute('/test arg1 arg2')

      expect(command.execute).toHaveBeenCalledWith('arg1 arg2')
    })

    it('should handle command with no arguments', async () => {
      const command = createMockCommand('learnings')
      router.register(command)

      await router.execute('/learnings')

      expect(command.execute).toHaveBeenCalledWith('')
    })

    it('should be case insensitive for command name', async () => {
      const command = createMockCommand('learn')
      router.register(command)

      await router.execute('/LEARN something')

      expect(command.execute).toHaveBeenCalledWith('something')
    })

    it('should trim input before processing', async () => {
      const command = createMockCommand('learn')
      router.register(command)

      await router.execute('  /learn something  ')

      expect(command.execute).toHaveBeenCalledWith('something')
    })
  })
})
