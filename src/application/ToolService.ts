import type { ToolResult, ToolDefinition } from '../domain/models/Tool'
import { createToolResult } from '../domain/models/Tool'
import type { ToolRegistry } from '../domain/ports/ToolRegistry'
import { createToolInvocationParser } from './ToolInvocationParser'

export interface ToolExecutionResult {
  toolName: string
  arguments: Record<string, unknown>
  result: ToolResult
}

export interface ToolService {
  invoke(name: string, args: Record<string, unknown>): Promise<ToolResult>
  getToolDescriptions(): ToolDefinition[]
  processResponse(response: string): Promise<ToolExecutionResult[]>
}

interface ToolServiceDependencies {
  registry: ToolRegistry
}

export function createToolService(deps: ToolServiceDependencies): ToolService {
  const { registry } = deps
  const parser = createToolInvocationParser()

  return {
    async invoke(name: string, args: Record<string, unknown>): Promise<ToolResult> {
      const tool = registry.get(name)

      if (!tool) {
        return createToolResult({
          success: false,
          output: '',
          error: `Tool "${name}" not found`
        })
      }

      return tool.execute(args)
    },

    getToolDescriptions(): ToolDefinition[] {
      return registry.list().map(tool => tool.definition)
    },

    async processResponse(response: string): Promise<ToolExecutionResult[]> {
      const invocations = parser.parse(response)
      const results: ToolExecutionResult[] = []

      for (const invocation of invocations) {
        const result = await this.invoke(invocation.toolName, invocation.arguments)
        results.push({
          toolName: invocation.toolName,
          arguments: invocation.arguments,
          result
        })
      }

      return results
    }
  }
}
