import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSystemPromptBuilder,
  type SystemPromptBuilder
} from '../../../src/application/SystemPromptBuilder'
import type { LearningService } from '../../../src/application/LearningService'
import type { ToolService } from '../../../src/application/ToolService'
import type { Learning, LearningCategory } from '../../../src/domain/models/Learning'
import { createToolDefinition, createToolParameter } from '../../../src/domain/models/Tool'

function createMockLearningService(): LearningService {
  return {
    addLearning: vi.fn(),
    removeLearning: vi.fn(),
    clearLearnings: vi.fn(),
    getLearnings: vi.fn().mockResolvedValue([]),
    getLearning: vi.fn(),
    getLearningsByCategory: vi.fn()
  }
}

function createMockToolService(): ToolService {
  return {
    invoke: vi.fn(),
    getToolDescriptions: vi.fn().mockReturnValue([]),
    processResponse: vi.fn()
  }
}

function createFakeLearning(
  id: string,
  content: string,
  category: LearningCategory = 'preference'
): Learning {
  return {
    id,
    content,
    category,
    createdAt: new Date()
  }
}

describe('SystemPromptBuilder', () => {
  let mockLearningService: LearningService
  let builder: SystemPromptBuilder

  const basePrompt = 'You are Albert, a helpful AI assistant.'

  beforeEach(() => {
    mockLearningService = createMockLearningService()
    builder = createSystemPromptBuilder(basePrompt, mockLearningService)
  })

  describe('build', () => {
    it('should return base prompt when no learnings', async () => {
      vi.mocked(mockLearningService.getLearnings).mockResolvedValue([])

      const result = await builder.build()

      expect(result).toBe(basePrompt)
    })

    it('should append learnings section when learnings exist', async () => {
      const learnings = [
        createFakeLearning('1', 'User prefers TypeScript'),
        createFakeLearning('2', 'User works at Acme Corp')
      ]
      vi.mocked(mockLearningService.getLearnings).mockResolvedValue(learnings)

      const result = await builder.build()

      expect(result).toContain(basePrompt)
      expect(result).toContain("[What I've learned about you]:")
      expect(result).toContain('- User prefers TypeScript')
      expect(result).toContain('- User works at Acme Corp')
    })

    it('should format learnings as bullet list', async () => {
      const learnings = [
        createFakeLearning('1', 'First learning'),
        createFakeLearning('2', 'Second learning'),
        createFakeLearning('3', 'Third learning')
      ]
      vi.mocked(mockLearningService.getLearnings).mockResolvedValue(learnings)

      const result = await builder.build()

      const lines = result.split('\n')
      const bulletLines = lines.filter(line => line.startsWith('- '))
      expect(bulletLines).toHaveLength(3)
    })

    it('should separate base prompt and learnings with blank line', async () => {
      const learnings = [createFakeLearning('1', 'Some learning')]
      vi.mocked(mockLearningService.getLearnings).mockResolvedValue(learnings)

      const result = await builder.build()

      expect(result).toContain(basePrompt + '\n\n')
    })

    it('should handle single learning', async () => {
      const learnings = [createFakeLearning('1', 'Only one learning')]
      vi.mocked(mockLearningService.getLearnings).mockResolvedValue(learnings)

      const result = await builder.build()

      expect(result).toContain('- Only one learning')
    })
  })

  describe('with tools', () => {
    let mockToolService: ToolService

    beforeEach(() => {
      mockToolService = createMockToolService()
      builder = createSystemPromptBuilder(basePrompt, mockLearningService, mockToolService)
    })

    it('should include tools section when tools are available', async () => {
      const toolDefs = [
        createToolDefinition({
          name: 'bash',
          description: 'Execute shell commands',
          parameters: [
            createToolParameter({ name: 'command', type: 'string', description: 'Command to run' })
          ]
        })
      ]
      vi.mocked(mockToolService.getToolDescriptions).mockReturnValue(toolDefs)

      const result = await builder.build()

      expect(result).toContain('[Available Tools]')
      expect(result).toContain('bash')
      expect(result).toContain('Execute shell commands')
    })

    it('should include tool parameters', async () => {
      const toolDefs = [
        createToolDefinition({
          name: 'read_file',
          description: 'Read file contents',
          parameters: [
            createToolParameter({ name: 'path', type: 'string', description: 'File path', required: true }),
            createToolParameter({ name: 'encoding', type: 'string', description: 'Encoding', required: false })
          ]
        })
      ]
      vi.mocked(mockToolService.getToolDescriptions).mockReturnValue(toolDefs)

      const result = await builder.build()

      expect(result).toContain('path')
      expect(result).toContain('(required)')
    })

    it('should include tool_call usage instructions', async () => {
      const toolDefs = [
        createToolDefinition({ name: 'bash', description: 'Run commands', parameters: [] })
      ]
      vi.mocked(mockToolService.getToolDescriptions).mockReturnValue(toolDefs)

      const result = await builder.build()

      expect(result).toContain('<tool_call>')
      expect(result).toContain('</tool_call>')
    })

    it('should not include tools section when no tools available', async () => {
      vi.mocked(mockToolService.getToolDescriptions).mockReturnValue([])

      const result = await builder.build()

      expect(result).not.toContain('[Available Tools]')
    })

    it('should include both tools and learnings', async () => {
      const toolDefs = [
        createToolDefinition({ name: 'bash', description: 'Run commands', parameters: [] })
      ]
      const learnings = [createFakeLearning('1', 'User prefers Python')]

      vi.mocked(mockToolService.getToolDescriptions).mockReturnValue(toolDefs)
      vi.mocked(mockLearningService.getLearnings).mockResolvedValue(learnings)

      const result = await builder.build()

      expect(result).toContain('[Available Tools]')
      expect(result).toContain("[What I've learned about you]")
      expect(result).toContain('bash')
      expect(result).toContain('User prefers Python')
    })
  })
})
