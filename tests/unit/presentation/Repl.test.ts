import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRepl, isExitCommand } from '../../../src/presentation/Repl'
import type { ChatSession } from '../../../src/application/ChatSession'
import type { UserInterface } from '../../../src/domain/ports/UserInterface'
import type { CommandRouter } from '../../../src/presentation/CommandRouter'

function createMockChatSession(): ChatSession {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    end: vi.fn().mockResolvedValue(undefined),
    isActive: vi.fn().mockReturnValue(true)
  }
}

function createMockUserInterface(): UserInterface {
  return {
    prompt: vi.fn().mockResolvedValue('test input'),
    write: vi.fn(),
    writeLine: vi.fn(),
    close: vi.fn()
  }
}

function createMockCommandRouter(): CommandRouter {
  return {
    isCommand: vi.fn().mockReturnValue(false),
    execute: vi.fn().mockResolvedValue({ handled: true, output: 'command output' }),
    register: vi.fn()
  }
}

describe('Repl', () => {
  let mockSession: ChatSession
  let mockUI: UserInterface
  let mockRouter: CommandRouter

  beforeEach(() => {
    mockSession = createMockChatSession()
    mockUI = createMockUserInterface()
    mockRouter = createMockCommandRouter()
  })

  describe('isExitCommand', () => {
    it('should return true for "exit"', () => {
      expect(isExitCommand('exit')).toBe(true)
    })

    it('should return true for "quit"', () => {
      expect(isExitCommand('quit')).toBe(true)
    })

    it('should return true for "/bye"', () => {
      expect(isExitCommand('/bye')).toBe(true)
    })

    it('should be case insensitive', () => {
      expect(isExitCommand('EXIT')).toBe(true)
      expect(isExitCommand('Quit')).toBe(true)
      expect(isExitCommand('/BYE')).toBe(true)
    })

    it('should return false for other input', () => {
      expect(isExitCommand('hello')).toBe(false)
      expect(isExitCommand('exit now')).toBe(false)
    })
  })

  describe('run', () => {
    it('should start the chat session', async () => {
      vi.mocked(mockUI.prompt).mockResolvedValueOnce('exit')

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockSession.start).toHaveBeenCalled()
    })

    it('should prompt user for input', async () => {
      vi.mocked(mockUI.prompt).mockResolvedValueOnce('exit')

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockUI.prompt).toHaveBeenCalledWith('> ')
    })

    it('should send user input to chat session', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('hello')
        .mockResolvedValueOnce('exit')

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockSession.sendMessage).toHaveBeenCalledWith('hello')
    })

    it('should loop until exit command', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second')
        .mockResolvedValueOnce('exit')

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockSession.sendMessage).toHaveBeenCalledTimes(2)
      expect(mockSession.sendMessage).toHaveBeenCalledWith('first')
      expect(mockSession.sendMessage).toHaveBeenCalledWith('second')
    })

    it('should end session on exit command', async () => {
      vi.mocked(mockUI.prompt).mockResolvedValueOnce('exit')

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockSession.end).toHaveBeenCalled()
    })

    it('should handle EOF (null input)', async () => {
      vi.mocked(mockUI.prompt).mockResolvedValueOnce(null)

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockSession.end).toHaveBeenCalled()
    })

    it('should ignore empty input', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('   ')
        .mockResolvedValueOnce('exit')

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockSession.sendMessage).not.toHaveBeenCalled()
    })

    it('should close UI after session ends', async () => {
      vi.mocked(mockUI.prompt).mockResolvedValueOnce('exit')

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockUI.close).toHaveBeenCalled()
    })
  })

  describe('stop', () => {
    it('should end session when stopped', async () => {
      let promptResolve: (value: string | null) => void
      vi.mocked(mockUI.prompt).mockReturnValue(
        new Promise((resolve) => {
          promptResolve = resolve
        })
      )

      const repl = createRepl(mockSession, mockUI)
      const runPromise = repl.run()

      await repl.stop()
      promptResolve!(null)
      await runPromise

      expect(mockSession.end).toHaveBeenCalled()
    })
  })

  describe('with CommandRouter', () => {
    it('should check if input is command when router provided', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('/learn something')
        .mockResolvedValueOnce('exit')
      vi.mocked(mockRouter.isCommand).mockReturnValue(true)

      const repl = createRepl(mockSession, mockUI, mockRouter)
      await repl.run()

      expect(mockRouter.isCommand).toHaveBeenCalledWith('/learn something')
    })

    it('should execute command when input is command', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('/learn something')
        .mockResolvedValueOnce('exit')
      vi.mocked(mockRouter.isCommand).mockReturnValue(true)

      const repl = createRepl(mockSession, mockUI, mockRouter)
      await repl.run()

      expect(mockRouter.execute).toHaveBeenCalledWith('/learn something')
    })

    it('should display command output', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('/learn something')
        .mockResolvedValueOnce('exit')
      vi.mocked(mockRouter.isCommand).mockReturnValue(true)
      vi.mocked(mockRouter.execute).mockResolvedValue({
        handled: true,
        output: 'Learned: "something"'
      })

      const repl = createRepl(mockSession, mockUI, mockRouter)
      await repl.run()

      expect(mockUI.writeLine).toHaveBeenCalledWith('Learned: "something"')
    })

    it('should not send command to chat session', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('/learn something')
        .mockResolvedValueOnce('exit')
      vi.mocked(mockRouter.isCommand).mockReturnValue(true)

      const repl = createRepl(mockSession, mockUI, mockRouter)
      await repl.run()

      expect(mockSession.sendMessage).not.toHaveBeenCalled()
    })

    it('should send non-command input to chat session', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('hello')
        .mockResolvedValueOnce('exit')
      vi.mocked(mockRouter.isCommand).mockReturnValue(false)

      const repl = createRepl(mockSession, mockUI, mockRouter)
      await repl.run()

      expect(mockSession.sendMessage).toHaveBeenCalledWith('hello')
    })

    it('should not display output when command has no output', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('/silent')
        .mockResolvedValueOnce('exit')
      vi.mocked(mockRouter.isCommand).mockReturnValue(true)
      vi.mocked(mockRouter.execute).mockResolvedValue({
        handled: true
      })

      const repl = createRepl(mockSession, mockUI, mockRouter)
      await repl.run()

      expect(mockUI.writeLine).not.toHaveBeenCalled()
    })

    it('should work without command router', async () => {
      vi.mocked(mockUI.prompt)
        .mockResolvedValueOnce('/learn something')
        .mockResolvedValueOnce('exit')

      const repl = createRepl(mockSession, mockUI)
      await repl.run()

      expect(mockSession.sendMessage).toHaveBeenCalledWith('/learn something')
    })
  })
})
