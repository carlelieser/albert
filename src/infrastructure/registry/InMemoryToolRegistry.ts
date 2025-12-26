import type { Tool, ToolRegistry } from '../../domain/ports/ToolRegistry'

export function createInMemoryToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>()

  return {
    register(tool: Tool): void {
      tools.set(tool.definition.name, tool)
    },

    get(name: string): Tool | undefined {
      return tools.get(name)
    },

    list(): Tool[] {
      return Array.from(tools.values())
    },

    has(name: string): boolean {
      return tools.has(name)
    },

    unregister(name: string): boolean {
      return tools.delete(name)
    }
  }
}
