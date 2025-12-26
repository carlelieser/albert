import { readFile } from 'fs/promises'
import { createToolDefinition, createToolParameter, createToolResult } from '../../domain/models/Tool'
import type { Tool } from '../../domain/ports/ToolRegistry'

export function createReadFileTool(): Tool {
  const definition = createToolDefinition({
    name: 'read_file',
    description: 'Read the contents of a file',
    parameters: [
      createToolParameter({
        name: 'path',
        type: 'string',
        description: 'Path to the file to read',
        required: true
      }),
      createToolParameter({
        name: 'encoding',
        type: 'string',
        description: 'File encoding',
        required: false,
        defaultValue: 'utf-8'
      })
    ]
  })

  return {
    definition,
    async execute(args: Record<string, unknown>) {
      const path = args.path as string
      const encoding = (args.encoding as BufferEncoding) ?? 'utf-8'

      try {
        const content = await readFile(path, { encoding })

        return createToolResult({
          success: true,
          output: content
        })
      } catch (error: unknown) {
        const err = error as { message?: string }

        return createToolResult({
          success: false,
          output: '',
          error: err.message || 'Failed to read file'
        })
      }
    }
  }
}
