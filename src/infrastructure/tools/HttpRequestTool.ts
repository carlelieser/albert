import { createToolDefinition, createToolParameter, createToolResult } from '../../domain/models/Tool'
import type { Tool } from '../../domain/ports/ToolRegistry'

export function createHttpRequestTool(): Tool {
  const definition = createToolDefinition({
    name: 'http_request',
    description: 'Make an HTTP request to a URL',
    parameters: [
      createToolParameter({
        name: 'url',
        type: 'string',
        description: 'The URL to request',
        required: true
      }),
      createToolParameter({
        name: 'method',
        type: 'string',
        description: 'HTTP method (GET, POST, PUT, DELETE, etc.)',
        required: false,
        defaultValue: 'GET'
      }),
      createToolParameter({
        name: 'body',
        type: 'string',
        description: 'Request body (for POST, PUT, etc.)',
        required: false
      }),
      createToolParameter({
        name: 'headers',
        type: 'object',
        description: 'Request headers as key-value pairs',
        required: false
      }),
      createToolParameter({
        name: 'timeout',
        type: 'number',
        description: 'Request timeout in milliseconds',
        required: false,
        defaultValue: 30000
      })
    ]
  })

  return {
    definition,
    async execute(args: Record<string, unknown>) {
      const url = args.url as string
      const method = (args.method as string) ?? 'GET'
      const body = args.body as string | undefined
      const headers = args.headers as Record<string, string> | undefined
      const timeout = (args.timeout as number) ?? 30000

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(url, {
          method,
          body,
          headers,
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        const responseText = await response.text()

        if (!response.ok) {
          return createToolResult({
            success: false,
            output: '',
            error: `HTTP ${response.status} ${response.statusText}: ${responseText}`
          })
        }

        return createToolResult({
          success: true,
          output: `HTTP ${response.status}\n\n${responseText}`
        })
      } catch (error: unknown) {
        const err = error as { message?: string }

        return createToolResult({
          success: false,
          output: '',
          error: err.message || 'Request failed'
        })
      }
    }
  }
}
