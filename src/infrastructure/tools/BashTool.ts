import { exec } from 'child_process'
import { promisify } from 'util'
import { createToolDefinition, createToolParameter, createToolResult } from '../../domain/models/Tool'
import type { Tool } from '../../domain/ports/ToolRegistry'

const execAsync = promisify(exec)

export function createBashTool(): Tool {
  const definition = createToolDefinition({
    name: 'bash',
    description: 'Execute a shell command',
    parameters: [
      createToolParameter({
        name: 'command',
        type: 'string',
        description: 'The shell command to execute',
        required: true
      }),
      createToolParameter({
        name: 'cwd',
        type: 'string',
        description: 'Working directory for the command',
        required: false
      }),
      createToolParameter({
        name: 'timeout',
        type: 'number',
        description: 'Timeout in milliseconds',
        required: false,
        defaultValue: 30000
      })
    ]
  })

  return {
    definition,
    async execute(args: Record<string, unknown>) {
      const command = args.command as string
      const cwd = args.cwd as string | undefined
      const timeout = (args.timeout as number) ?? 30000

      try {
        const { stdout, stderr } = await execAsync(command, {
          cwd,
          timeout
        })

        return createToolResult({
          success: true,
          output: stdout + stderr
        })
      } catch (error: unknown) {
        const err = error as { stderr?: string; message?: string }
        const errorMessage = err.stderr || err.message || 'Unknown error'

        return createToolResult({
          success: false,
          output: '',
          error: errorMessage
        })
      }
    }
  }
}
