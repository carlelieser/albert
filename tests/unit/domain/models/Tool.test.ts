import { describe, it, expect } from 'vitest'
import {
  createToolParameter,
  createToolDefinition,
  createToolResult,
  createToolInvocation,
  type ToolParameter,
  type ToolDefinition,
  type ToolResult
} from '../../../../src/domain/models/Tool'

describe('Tool', () => {
  describe('createToolParameter', () => {
    it('should create parameter with required fields', () => {
      const param = createToolParameter({
        name: 'command',
        type: 'string',
        description: 'The command to execute'
      })

      expect(param.name).toBe('command')
      expect(param.type).toBe('string')
      expect(param.description).toBe('The command to execute')
      expect(param.required).toBe(true)
    })

    it('should default required to true', () => {
      const param = createToolParameter({
        name: 'path',
        type: 'string',
        description: 'File path'
      })

      expect(param.required).toBe(true)
    })

    it('should allow optional parameters', () => {
      const param = createToolParameter({
        name: 'timeout',
        type: 'number',
        description: 'Timeout in ms',
        required: false,
        defaultValue: 30000
      })

      expect(param.required).toBe(false)
      expect(param.defaultValue).toBe(30000)
    })

    it('should support all parameter types', () => {
      const types: ToolParameter['type'][] = ['string', 'number', 'boolean', 'array', 'object']

      types.forEach(type => {
        const param = createToolParameter({
          name: 'test',
          type,
          description: 'Test param'
        })
        expect(param.type).toBe(type)
      })
    })

    it('should be immutable', () => {
      const param = createToolParameter({
        name: 'test',
        type: 'string',
        description: 'Test'
      })

      expect(Object.isFrozen(param)).toBe(true)
    })
  })

  describe('createToolDefinition', () => {
    it('should create tool definition with name and description', () => {
      const tool = createToolDefinition({
        name: 'bash',
        description: 'Execute shell commands',
        parameters: []
      })

      expect(tool.name).toBe('bash')
      expect(tool.description).toBe('Execute shell commands')
      expect(tool.parameters).toEqual([])
    })

    it('should include parameters', () => {
      const param = createToolParameter({
        name: 'command',
        type: 'string',
        description: 'Command to run'
      })

      const tool = createToolDefinition({
        name: 'bash',
        description: 'Execute shell commands',
        parameters: [param]
      })

      expect(tool.parameters).toHaveLength(1)
      expect(tool.parameters[0].name).toBe('command')
    })

    it('should be immutable', () => {
      const tool = createToolDefinition({
        name: 'bash',
        description: 'Execute shell commands',
        parameters: []
      })

      expect(Object.isFrozen(tool)).toBe(true)
    })
  })

  describe('createToolResult', () => {
    it('should create successful result', () => {
      const result = createToolResult({
        success: true,
        output: 'file1.txt\nfile2.txt'
      })

      expect(result.success).toBe(true)
      expect(result.output).toBe('file1.txt\nfile2.txt')
      expect(result.error).toBeUndefined()
    })

    it('should create failed result with error', () => {
      const result = createToolResult({
        success: false,
        output: '',
        error: 'Command not found'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Command not found')
    })

    it('should be immutable', () => {
      const result = createToolResult({
        success: true,
        output: 'done'
      })

      expect(Object.isFrozen(result)).toBe(true)
    })
  })

  describe('createToolInvocation', () => {
    it('should create invocation with tool name and arguments', () => {
      const invocation = createToolInvocation('bash', { command: 'ls -la' })

      expect(invocation.toolName).toBe('bash')
      expect(invocation.arguments).toEqual({ command: 'ls -la' })
    })

    it('should set timestamp', () => {
      const before = new Date()
      const invocation = createToolInvocation('bash', { command: 'pwd' })
      const after = new Date()

      expect(invocation.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(invocation.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should be immutable', () => {
      const invocation = createToolInvocation('bash', { command: 'ls' })

      expect(Object.isFrozen(invocation)).toBe(true)
      expect(Object.isFrozen(invocation.arguments)).toBe(true)
    })
  })
})
