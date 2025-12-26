export interface CommandResult {
  handled: boolean
  output?: string
}

export interface Command {
  name: string
  execute(args: string): Promise<CommandResult>
}

export interface CommandRouter {
  isCommand(input: string): boolean
  execute(input: string): Promise<CommandResult>
  register(command: Command): void
}

export function createCommandRouter(): CommandRouter {
  const commands = new Map<string, Command>()

  return {
    isCommand(input: string): boolean {
      const trimmed = input.trim()
      return trimmed.length > 0 && trimmed.startsWith('/')
    },

    register(command: Command): void {
      commands.set(command.name.toLowerCase(), command)
    },

    async execute(input: string): Promise<CommandResult> {
      const trimmed = input.trim()
      const spaceIndex = trimmed.indexOf(' ')
      
      const commandName = spaceIndex === -1 
        ? trimmed.substring(1)
        : trimmed.substring(1, spaceIndex)
      
      const args = spaceIndex === -1 
        ? ''
        : trimmed.substring(spaceIndex + 1).trim()

      const command = commands.get(commandName.toLowerCase())
      
      if (!command) {
        return {
          handled: false,
          output: `Unknown command: /${commandName}. Type /help for available commands.`
        }
      }

      return command.execute(args)
    }
  }
}
