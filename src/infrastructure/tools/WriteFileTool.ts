import { writeFile } from 'fs/promises'
import { createToolDefinition, createToolParameter, createToolResult } from '../../domain/models/Tool'
import type { Tool } from '../../domain/ports/ToolRegistry'

export function createWriteFileTool(): Tool {
  const definition = createToolDefinition({
    name: 'write_file',
    description: 'Write content to a file',
    parameters: [
      createToolParameter({
        name: 'path',
        type: 'string',
        description: 'Path to the file to write',
        required: true
      }),
      createToolParameter({
        name: 'content',
        type: 'string',
        description: 'Content to write to the file',
        required: true
      })
    ]
  })

  return {
    definition,
    async execute(args: Record<string, unknown>) {
      const path = args.path as string
      const content = args.content as string

      try {
        await writeFile(path, content, 'utf-8')

        return createToolResult({
          success: true,
          output: `Successfully wrote to ${path}`
        })
      } catch (error: unknown) {
        const err = error as { message?: string }

        return createToolResult({
          success: false,
          output: '',
          error: err.message || 'Failed to write file'
        })
      }
    }
  }
}
