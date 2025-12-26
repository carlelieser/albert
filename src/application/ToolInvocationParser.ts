import { createToolInvocation, type ToolInvocation } from '../domain/models/Tool'

export interface ToolInvocationParser {
  parse(response: string): ToolInvocation[]
}

const TOOL_CALL_REGEX = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g

export function createToolInvocationParser(): ToolInvocationParser {
  return {
    parse(response: string): ToolInvocation[] {
      const invocations: ToolInvocation[] = []
      const matches = response.matchAll(TOOL_CALL_REGEX)

      for (const match of matches) {
        const jsonContent = match[1].trim()

        try {
          const parsed = JSON.parse(jsonContent)

          if (typeof parsed.name !== 'string') {
            continue
          }

          const args = parsed.arguments ?? {}
          invocations.push(createToolInvocation(parsed.name, args))
        } catch {
          // Skip malformed JSON
          continue
        }
      }

      return invocations
    }
  }
}
