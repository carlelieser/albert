import type { ChatSession } from '../application/ChatSession'
import type { UserInterface } from '../domain/ports/UserInterface'
import type { CommandRouter } from './CommandRouter'

const EXIT_COMMANDS = ['exit', 'quit', '/bye']

export function isExitCommand(input: string): boolean {
  return EXIT_COMMANDS.includes(input.toLowerCase().trim())
}

export interface Repl {
  run(): Promise<void>
  stop(): Promise<void>
}

export interface ReplDependencies {
  chatSession: ChatSession
  userInterface: UserInterface
  commandRouter?: CommandRouter
}

export function createRepl(
  chatSession: ChatSession,
  userInterface: UserInterface,
  commandRouter?: CommandRouter
): Repl {
  let running = false
  let stopping = false

  return {
    async run(): Promise<void> {
      running = true

      await chatSession.start()

      while (running && !stopping) {
        const input = await userInterface.prompt('> ')

        if (input === null || isExitCommand(input)) {
          break
        }

        if (input.trim() === '') {
          continue
        }

        if (commandRouter && commandRouter.isCommand(input)) {
          const result = await commandRouter.execute(input)
          if (result.output) {
            userInterface.writeLine(result.output)
          }
          continue
        }

        await chatSession.sendMessage(input)
      }

      running = false
      await chatSession.end()
      userInterface.close()
    },

    async stop(): Promise<void> {
      stopping = true
    }
  }
}
