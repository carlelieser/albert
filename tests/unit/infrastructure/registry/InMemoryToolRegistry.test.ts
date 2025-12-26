import { describe, it, expect, beforeEach } from 'vitest'
import { createInMemoryToolRegistry } from '../../../../src/infrastructure/registry/InMemoryToolRegistry'
import { createToolDefinition, createToolParameter, createToolResult } from '../../../../src/domain/models/Tool'
import type { Tool } from '../../../../src/domain/ports/ToolRegistry'

function createMockTool(name: string): Tool {
  return {
    definition: createToolDefinition({
      name,
      description: `Mock ${name} tool`,
      parameters: []
    }),
    execute: async () => createToolResult({ success: true, output: 'ok' })
  }
}

describe('InMemoryToolRegistry', () => {
  let registry: ReturnType<typeof createInMemoryToolRegistry>

  beforeEach(() => {
    registry = createInMemoryToolRegistry()
  })

  describe('register', () => {
    it('should register a tool', () => {
      const tool = createMockTool('bash')

      registry.register(tool)

      expect(registry.has('bash')).toBe(true)
    })

    it('should overwrite existing tool with same name', () => {
      const tool1 = createMockTool('bash')
      const tool2 = createMockTool('bash')

      registry.register(tool1)
      registry.register(tool2)

      expect(registry.list()).toHaveLength(1)
    })
  })

  describe('get', () => {
    it('should return registered tool', () => {
      const tool = createMockTool('bash')
      registry.register(tool)

      const retrieved = registry.get('bash')

      expect(retrieved).toBe(tool)
    })

    it('should return undefined for unknown tool', () => {
      const retrieved = registry.get('unknown')

      expect(retrieved).toBeUndefined()
    })
  })

  describe('list', () => {
    it('should return empty array when no tools registered', () => {
      expect(registry.list()).toEqual([])
    })

    it('should return all registered tools', () => {
      registry.register(createMockTool('bash'))
      registry.register(createMockTool('read_file'))
      registry.register(createMockTool('write_file'))

      const tools = registry.list()

      expect(tools).toHaveLength(3)
      expect(tools.map(t => t.definition.name)).toContain('bash')
      expect(tools.map(t => t.definition.name)).toContain('read_file')
      expect(tools.map(t => t.definition.name)).toContain('write_file')
    })
  })

  describe('has', () => {
    it('should return true for registered tool', () => {
      registry.register(createMockTool('bash'))

      expect(registry.has('bash')).toBe(true)
    })

    it('should return false for unregistered tool', () => {
      expect(registry.has('bash')).toBe(false)
    })
  })

  describe('unregister', () => {
    it('should remove registered tool', () => {
      registry.register(createMockTool('bash'))

      const result = registry.unregister('bash')

      expect(result).toBe(true)
      expect(registry.has('bash')).toBe(false)
    })

    it('should return false for unknown tool', () => {
      const result = registry.unregister('unknown')

      expect(result).toBe(false)
    })
  })
})
