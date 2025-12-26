import type { ToolResult } from '../models/Tool'

export interface ToolExecutor {
  execute(name: string, args: Record<string, unknown>): Promise<ToolResult>
}
