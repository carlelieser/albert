import type { ToolDefinition, ToolResult } from '../models/Tool'

export interface Tool {
  readonly definition: ToolDefinition
  execute(args: Record<string, unknown>): Promise<ToolResult>
}

export interface ToolRegistry {
  register(tool: Tool): void
  get(name: string): Tool | undefined
  list(): Tool[]
  has(name: string): boolean
  unregister(name: string): boolean
}
