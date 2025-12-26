import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createConsoleInterface } from '../../../../src/infrastructure/console/ConsoleInterface'
import { Readable, Writable } from 'stream'
import * as readline from 'readline'

vi.mock('readline')

describe('ConsoleInterface', () => {
  let mockInput: Readable
  let mockOutput: Writable
  let outputBuffer: string[]
  let lineHandlers: ((line: string) => void)[]
  let closeHandlers: (() => void)[]
  let mockRlInterface: {
    on: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    outputBuffer = []
    lineHandlers = []
    closeHandlers = []
    mockInput = new Readable({ read() {} })
    mockOutput = new Writable({
      write(chunk, _encoding, callback) {
        outputBuffer.push(chunk.toString())
        callback()
      }
    })

    mockRlInterface = {
      on: vi.fn((event: string, handler: () => void) => {
        if (event === 'line') {
          lineHandlers.push(handler)
        } else if (event === 'close') {
          closeHandlers.push(handler)
        }
        return mockRlInterface
      }),
      close: vi.fn()
    }

    vi.mocked(readline.createInterface).mockReturnValue(
      mockRlInterface as unknown as readline.Interface
    )
  })

  describe('prompt', () => {
    it('should display prompt and return user input', async () => {
      const ui = createConsoleInterface(mockInput, mockOutput)

      const resultPromise = ui.prompt('> ')

      lineHandlers[0]('user input')
      const result = await resultPromise

      expect(outputBuffer.join('')).toBe('> ')
      expect(result).toBe('user input')
    })

    it('should return buffered lines immediately', async () => {
      const ui = createConsoleInterface(mockInput, mockOutput)

      lineHandlers[0]('buffered line')

      const result = await ui.prompt('> ')

      expect(result).toBe('buffered line')
    })

    it('should return null on EOF', async () => {
      const ui = createConsoleInterface(mockInput, mockOutput)

      const resultPromise = ui.prompt('> ')

      closeHandlers[0]()
      const result = await resultPromise

      expect(result).toBeNull()
    })

    it('should return null if already closed', async () => {
      const ui = createConsoleInterface(mockInput, mockOutput)

      closeHandlers[0]()

      const result = await ui.prompt('> ')

      expect(result).toBeNull()
    })
  })

  describe('write', () => {
    it('should write text without newline', () => {
      const ui = createConsoleInterface(mockInput, mockOutput)

      ui.write('Hello')

      expect(outputBuffer.join('')).toBe('Hello')
    })
  })

  describe('writeLine', () => {
    it('should write text with newline', () => {
      const ui = createConsoleInterface(mockInput, mockOutput)

      ui.writeLine('Hello')

      expect(outputBuffer.join('')).toBe('Hello\n')
    })
  })

  describe('close', () => {
    it('should close the readline interface', () => {
      const ui = createConsoleInterface(mockInput, mockOutput)

      ui.close()

      expect(mockRlInterface.close).toHaveBeenCalled()
    })
  })
})
