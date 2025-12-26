import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createToolService } from '../../../src/application/ToolService'
import { createInMemoryToolRegistry } from '../../../src/infrastructure/registry/InMemoryToolRegistry'
import { createToolDefinition, createToolResult } from '../../../src/domain/models/Tool'
import type { Tool } from '../../../src/domain/ports/ToolRegistry'

function createMockTool(name: string, output: string = 'ok'): Tool {
  return {
    definition: createToolDefinition({
      name,
      description: `Mock ${name} tool`,
      parameters: []
    }),
    execute: vi.fn().mockResolvedValue(createToolResult({ success: true, output }))
  }
}

describe('ToolService', () => {
  let registry: ReturnType<typeof createInMemoryToolRegistry>
  let service: ReturnType<typeof createToolService>

  beforeEach(() => {
    registry = createInMemoryToolRegistry()
    service = createToolService({ registry })
  })

  describe('invoke', () => {
    it('should execute registered tool', async () => {
      const tool = createMockTool('bash', 'hello')
      registry.register(tool)

      const result = await service.invoke('bash', { command: 'echo hello' })

      expect(result.success).toBe(true)
      expect(result.output).toBe('hello')
      expect(tool.execute).toHaveBeenCalledWith({ command: 'echo hello' })
    })

    it('should return error for unregistered tool', async () => {
      const result = await service.invoke('unknown', {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('getToolDescriptions', () => {
    it('should return descriptions for all registered tools', () => {
      registry.register(createMockTool('bash'))
      registry.register(createMockTool('read_file'))

      const descriptions = service.getToolDescriptions()

      expect(descriptions).toHaveLength(2)
      expect(descriptions.map(d => d.name)).toContain('bash')
      expect(descriptions.map(d => d.name)).toContain('read_file')
    })

    it('should return empty array when no tools registered', () => {
      const descriptions = service.getToolDescriptions()

      expect(descriptions).toEqual([])
    })
  })

  describe('processResponse', () => {
    it('should execute tools from LLM response', async () => {
      const tool = createMockTool('bash', 'file1.txt')
      registry.register(tool)

      const response = `Let me list files.
<tool_call>
{"name": "bash", "arguments": {"command": "ls"}}
</tool_call>`

      const results = await service.processResponse(response)

      expect(results).toHaveLength(1)
      expect(results[0].toolName).toBe('bash')
      expect(results[0].result.success).toBe(true)
      expect(results[0].result.output).toBe('file1.txt')
    })

    it('should execute multiple tools in sequence', async () => {
      registry.register(createMockTool('read_file', 'content'))
      registry.register(createMockTool('write_file', 'written'))

      const response = `<tool_call>
{"name": "read_file", "arguments": {"path": "/tmp/a.txt"}}
</tool_call>
<tool_call>
{"name": "write_file", "arguments": {"path": "/tmp/b.txt", "content": "data"}}
</tool_call>`

      const results = await service.processResponse(response)

      expect(results).toHaveLength(2)
      expect(results[0].toolName).toBe('read_file')
      expect(results[1].toolName).toBe('write_file')
    })

    it('should return empty array when no tool calls', async () => {
      const results = await service.processResponse('Just a message.')

      expect(results).toEqual([])
    })

    it('should include error for failed tool execution', async () => {
      const tool: Tool = {
        definition: createToolDefinition({
          name: 'failing_tool',
          description: 'A tool that fails',
          parameters: []
        }),
        execute: vi.fn().mockResolvedValue(createToolResult({
          success: false,
          output: '',
          error: 'Something went wrong'
        }))
      }
      registry.register(tool)

      const response = `<tool_call>
{"name": "failing_tool", "arguments": {}}
</tool_call>`

      const results = await service.processResponse(response)

      expect(results[0].result.success).toBe(false)
      expect(results[0].result.error).toBe('Something went wrong')
    })
  })
})
