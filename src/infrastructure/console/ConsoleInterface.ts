import * as readline from 'readline'
import type { UserInterface } from '../../domain/ports/UserInterface'

export function createConsoleInterface(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream
): UserInterface {
  const rl = readline.createInterface({
    input,
    output,
    terminal: false
  })

  const lines: string[] = []
  let closed = false
  let pendingResolve: ((value: string | null) => void) | null = null

  rl.on('line', (line) => {
    if (pendingResolve) {
      const resolve = pendingResolve
      pendingResolve = null
      resolve(line)
    } else {
      lines.push(line)
    }
  })

  rl.on('close', () => {
    closed = true
    if (pendingResolve) {
      pendingResolve(null)
      pendingResolve = null
    }
  })

  return {
    prompt(message: string): Promise<string | null> {
      output.write(message)

      if (lines.length > 0) {
        return Promise.resolve(lines.shift()!)
      }

      if (closed) {
        return Promise.resolve(null)
      }

      return new Promise((resolve) => {
        pendingResolve = resolve
      })
    },

    write(text: string): void {
      output.write(text)
    },

    writeLine(text: string): void {
      output.write(text + '\n')
    },

    close(): void {
      rl.close()
    }
  }
}
