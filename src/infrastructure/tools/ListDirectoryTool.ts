import { readdir, stat } from 'fs/promises'
import { join } from 'path'
import { createToolDefinition, createToolParameter, createToolResult } from '../../domain/models/Tool'
import type { Tool } from '../../domain/ports/ToolRegistry'

export function createListDirectoryTool(): Tool {
  const definition = createToolDefinition({
    name: 'list_directory',
    description: 'List the contents of a directory',
    parameters: [
      createToolParameter({
        name: 'path',
        type: 'string',
        description: 'Path to the directory to list',
        required: true
      }),
      createToolParameter({
        name: 'recursive',
        type: 'boolean',
        description: 'Whether to list recursively',
        required: false,
        defaultValue: false
      })
    ]
  })

  async function listDir(dirPath: string, recursive: boolean): Promise<string[]> {
    const entries = await readdir(dirPath, { withFileTypes: true })
    const results: string[] = []

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name)
      const relativePath = entry.name

      if (entry.isDirectory()) {
        results.push(`${relativePath}/`)
        if (recursive) {
          const subEntries = await listDir(fullPath, true)
          results.push(...subEntries.map(e => `${relativePath}/${e}`))
        }
      } else {
        results.push(relativePath)
      }
    }

    return results
  }

  return {
    definition,
    async execute(args: Record<string, unknown>) {
      const path = args.path as string
      const recursive = (args.recursive as boolean) ?? false

      try {
        const stats = await stat(path)
        if (!stats.isDirectory()) {
          return createToolResult({
            success: false,
            output: '',
            error: `"${path}" is not a directory`
          })
        }

        const entries = await listDir(path, recursive)

        return createToolResult({
          success: true,
          output: entries.join('\n')
        })
      } catch (error: unknown) {
        const err = error as { message?: string }

        return createToolResult({
          success: false,
          output: '',
          error: err.message || 'Failed to list directory'
        })
      }
    }
  }
}
