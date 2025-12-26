import { describe, it, expect } from 'vitest'
import { createToolInvocationParser } from '../../../src/application/ToolInvocationParser'

describe('ToolInvocationParser', () => {
  const parser = createToolInvocationParser()

  describe('parse', () => {
    it('should parse single tool call', () => {
      const response = `I'll list the files for you.
<tool_call>
{"name": "bash", "arguments": {"command": "ls -la"}}
</tool_call>`

      const invocations = parser.parse(response)

      expect(invocations).toHaveLength(1)
      expect(invocations[0].toolName).toBe('bash')
      expect(invocations[0].arguments).toEqual({ command: 'ls -la' })
    })

    it('should parse multiple tool calls', () => {
      const response = `Let me read both files.
<tool_call>
{"name": "read_file", "arguments": {"path": "/tmp/a.txt"}}
</tool_call>
And the second one:
<tool_call>
{"name": "read_file", "arguments": {"path": "/tmp/b.txt"}}
</tool_call>`

      const invocations = parser.parse(response)

      expect(invocations).toHaveLength(2)
      expect(invocations[0].arguments.path).toBe('/tmp/a.txt')
      expect(invocations[1].arguments.path).toBe('/tmp/b.txt')
    })

    it('should return empty array when no tool calls', () => {
      const response = 'Just a regular message with no tools.'

      const invocations = parser.parse(response)

      expect(invocations).toEqual([])
    })

    it('should handle malformed JSON gracefully', () => {
      const response = `<tool_call>
{invalid json}
</tool_call>`

      const invocations = parser.parse(response)

      expect(invocations).toEqual([])
    })

    it('should handle missing name field', () => {
      const response = `<tool_call>
{"arguments": {"command": "ls"}}
</tool_call>`

      const invocations = parser.parse(response)

      expect(invocations).toEqual([])
    })

    it('should handle missing arguments field', () => {
      const response = `<tool_call>
{"name": "bash"}
</tool_call>`

      const invocations = parser.parse(response)

      expect(invocations).toHaveLength(1)
      expect(invocations[0].toolName).toBe('bash')
      expect(invocations[0].arguments).toEqual({})
    })

    it('should trim whitespace in tool call content', () => {
      const response = `<tool_call>
  {"name": "bash", "arguments": {"command": "pwd"}}
</tool_call>`

      const invocations = parser.parse(response)

      expect(invocations).toHaveLength(1)
      expect(invocations[0].toolName).toBe('bash')
    })

    it('should set timestamp on invocations', () => {
      const response = `<tool_call>
{"name": "bash", "arguments": {"command": "date"}}
</tool_call>`

      const before = new Date()
      const invocations = parser.parse(response)
      const after = new Date()

      expect(invocations[0].timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(invocations[0].timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })
})
