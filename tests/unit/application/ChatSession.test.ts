import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChatSession } from '../../../src/application/ChatSession'
import type { ModelClient, StreamChunk } from '../../../src/domain/ports/ModelClient'
import type { UserInterface } from '../../../src/domain/ports/UserInterface'
import type { AlbertConfiguration } from '../../../src/application/Configuration'
import type { SystemPromptBuilder } from '../../../src/application/SystemPromptBuilder'
import type { LearningExtractor } from '../../../src/application/LearningExtractor'
import type { ToolService } from '../../../src/application/ToolService'
import { createToolResult } from '../../../src/domain/models/Tool'

function createMockModelClient(): ModelClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    loadModel: vi.fn().mockResolvedValue(undefined),
    generate: vi.fn().mockResolvedValue('Mock response'),
    unloadModel: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn().mockReturnValue(false),
    isModelLoaded: vi.fn().mockReturnValue(false)
  }
}

function createMockUserInterface(): UserInterface {
  return {
    prompt: vi.fn().mockResolvedValue('test input'),
    write: vi.fn(),
    writeLine: vi.fn(),
    close: vi.fn()
  }
}

function createMockSystemPromptBuilder(): SystemPromptBuilder {
  return {
    build: vi.fn().mockResolvedValue('You are Albert, a helpful AI assistant.')
  }
}

function createMockLearningExtractor(): LearningExtractor {
  return {
    extract: vi.fn().mockResolvedValue(undefined)
  }
}

function createMockToolService(): ToolService {
  return {
    invoke: vi.fn().mockResolvedValue(createToolResult({ success: true, output: 'tool output' })),
    getToolDescriptions: vi.fn().mockReturnValue([]),
    processResponse: vi.fn().mockResolvedValue([])
  }
}

const testConfig: AlbertConfiguration = {
  ollamaHost: 'http://localhost:11434',
  modelName: 'llama3.2:3b',
  systemPrompt: 'You are Albert, a helpful AI assistant.',
  dataDirectory: '/tmp/.albert'
}

describe('ChatSession', () => {
  let mockModelClient: ModelClient
  let mockUserInterface: UserInterface
  let mockSystemPromptBuilder: SystemPromptBuilder
  let mockLearningExtractor: LearningExtractor

  beforeEach(() => {
    mockModelClient = createMockModelClient()
    mockUserInterface = createMockUserInterface()
    mockSystemPromptBuilder = createMockSystemPromptBuilder()
    mockLearningExtractor = createMockLearningExtractor()
  })

  describe('start', () => {
    it('should connect to model client', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)

      await session.start()

      expect(mockModelClient.connect).toHaveBeenCalled()
    })

    it('should display loading message', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)

      await session.start()

      expect(mockUserInterface.writeLine).toHaveBeenCalledWith('Loading model llama3.2:3b...')
    })

    it('should load the configured model', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)

      await session.start()

      expect(mockModelClient.loadModel).toHaveBeenCalledWith('llama3.2:3b')
    })

    it('should display ready message after loading', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)

      await session.start()

      expect(mockUserInterface.writeLine).toHaveBeenCalledWith('Model ready.')
    })

    it('should set session as active', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)

      expect(session.isActive()).toBe(false)
      await session.start()
      expect(session.isActive()).toBe(true)
    })
  })

  describe('sendMessage', () => {
    it('should send user message to model', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.sendMessage('Hello')

      expect(mockModelClient.generate).toHaveBeenCalled()
      const callArgs = vi.mocked(mockModelClient.generate).mock.calls[0]
      expect(callArgs[0]).toContainEqual({ role: 'user', content: 'Hello' })
    })

    it('should maintain conversation history', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.sendMessage('First message')
      await session.sendMessage('Second message')

      const callArgs = vi.mocked(mockModelClient.generate).mock.calls[1]
      expect(callArgs[0].length).toBeGreaterThan(1)
    })

    it('should write newline after response', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.sendMessage('Hello')

      expect(mockUserInterface.writeLine).toHaveBeenCalledWith('')
    })

    it('should prepend system message to all requests', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.sendMessage('Hello')

      const callArgs = vi.mocked(mockModelClient.generate).mock.calls[0]
      expect(callArgs[0][0]).toEqual({ role: 'system', content: 'You are Albert, a helpful AI assistant.' })
    })

    it('should build system prompt for each message', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.sendMessage('First message')
      await session.sendMessage('Second message')

      expect(mockSystemPromptBuilder.build).toHaveBeenCalledTimes(2)
    })

    it('should use updated system prompt on each message', async () => {
      vi.mocked(mockSystemPromptBuilder.build)
        .mockResolvedValueOnce('Initial prompt')
        .mockResolvedValueOnce('Updated prompt with learnings')

      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder, mockLearningExtractor)
      await session.start()

      await session.sendMessage('First message')
      await session.sendMessage('Second message')

      const firstCallArgs = vi.mocked(mockModelClient.generate).mock.calls[0]
      const secondCallArgs = vi.mocked(mockModelClient.generate).mock.calls[1]

      expect(firstCallArgs[0][0]).toEqual({ role: 'system', content: 'Initial prompt' })
      expect(secondCallArgs[0][0]).toEqual({ role: 'system', content: 'Updated prompt with learnings' })
    })

    it('should call learning extractor after each response', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder, mockLearningExtractor)
      await session.start()

      await session.sendMessage('Hello')

      expect(mockLearningExtractor.extract).toHaveBeenCalled()
    })

    it('should pass conversation to learning extractor', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder, mockLearningExtractor)
      await session.start()

      await session.sendMessage('Hello')

      const extractCall = vi.mocked(mockLearningExtractor.extract).mock.calls[0]
      expect(extractCall[0]).toContainEqual(expect.objectContaining({ role: 'user', content: 'Hello' }))
      expect(extractCall[0]).toContainEqual(expect.objectContaining({ role: 'assistant', content: 'Mock response' }))
    })

    it('should not fail if learning extractor throws', async () => {
      vi.mocked(mockLearningExtractor.extract).mockRejectedValue(new Error('Extraction failed'))

      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder, mockLearningExtractor)
      await session.start()

      await expect(session.sendMessage('Hello')).resolves.not.toThrow()
    })
  })

  describe('end', () => {
    it('should display unloading message', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.end()

      expect(mockUserInterface.writeLine).toHaveBeenCalledWith('Unloading model...')
    })

    it('should unload the model', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.end()

      expect(mockModelClient.unloadModel).toHaveBeenCalled()
    })

    it('should disconnect from model client', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.end()

      expect(mockModelClient.disconnect).toHaveBeenCalled()
    })

    it('should display goodbye message', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()

      await session.end()

      expect(mockUserInterface.writeLine).toHaveBeenCalledWith('Goodbye.')
    })

    it('should set session as inactive', async () => {
      const session = createChatSession(mockModelClient, mockUserInterface, testConfig, mockSystemPromptBuilder)
      await session.start()
      expect(session.isActive()).toBe(true)

      await session.end()

      expect(session.isActive()).toBe(false)
    })
  })

  describe('tool integration', () => {
    let mockToolService: ToolService

    beforeEach(() => {
      mockToolService = createMockToolService()
    })

    it('should process tool calls from response', async () => {
      vi.mocked(mockModelClient.generate)
        .mockResolvedValueOnce('Using bash tool')
        .mockResolvedValueOnce('Done')
      vi.mocked(mockToolService.processResponse)
        .mockResolvedValueOnce([{
          toolName: 'bash',
          arguments: { command: 'ls' },
          result: createToolResult({ success: true, output: 'file1.txt' })
        }])
        .mockResolvedValueOnce([])

      const session = createChatSession(
        mockModelClient,
        mockUserInterface,
        testConfig,
        mockSystemPromptBuilder,
        undefined,
        mockToolService
      )
      await session.start()
      await session.sendMessage('List files')

      expect(mockToolService.processResponse).toHaveBeenCalledWith('Using bash tool')
    })

    it('should display tool results', async () => {
      vi.mocked(mockModelClient.generate)
        .mockResolvedValueOnce('Let me check')
        .mockResolvedValueOnce('Done')
      vi.mocked(mockToolService.processResponse)
        .mockResolvedValueOnce([{
          toolName: 'bash',
          arguments: { command: 'pwd' },
          result: createToolResult({ success: true, output: '/home/user' })
        }])
        .mockResolvedValueOnce([])

      const session = createChatSession(
        mockModelClient,
        mockUserInterface,
        testConfig,
        mockSystemPromptBuilder,
        undefined,
        mockToolService
      )
      await session.start()
      await session.sendMessage('Where am I?')

      expect(mockUserInterface.writeLine).toHaveBeenCalledWith(expect.stringContaining('bash'))
      expect(mockUserInterface.writeLine).toHaveBeenCalledWith(expect.stringContaining('/home/user'))
    })

    it('should continue conversation after tool execution', async () => {
      vi.mocked(mockModelClient.generate)
        .mockResolvedValueOnce('<tool_call>{"name": "bash", "arguments": {"command": "ls"}}</tool_call>')
        .mockResolvedValueOnce('Here are the files: file1.txt')

      vi.mocked(mockToolService.processResponse)
        .mockResolvedValueOnce([{
          toolName: 'bash',
          arguments: { command: 'ls' },
          result: createToolResult({ success: true, output: 'file1.txt' })
        }])
        .mockResolvedValueOnce([])

      const session = createChatSession(
        mockModelClient,
        mockUserInterface,
        testConfig,
        mockSystemPromptBuilder,
        undefined,
        mockToolService
      )
      await session.start()
      await session.sendMessage('List files')

      expect(mockModelClient.generate).toHaveBeenCalledTimes(2)
    })

    it('should include tool results in follow-up message', async () => {
      vi.mocked(mockModelClient.generate)
        .mockResolvedValueOnce('Using tool')
        .mockResolvedValueOnce('Done')

      vi.mocked(mockToolService.processResponse)
        .mockResolvedValueOnce([{
          toolName: 'bash',
          arguments: { command: 'ls' },
          result: createToolResult({ success: true, output: 'file1.txt' })
        }])
        .mockResolvedValueOnce([])

      const session = createChatSession(
        mockModelClient,
        mockUserInterface,
        testConfig,
        mockSystemPromptBuilder,
        undefined,
        mockToolService
      )
      await session.start()
      await session.sendMessage('List files')

      const secondCall = vi.mocked(mockModelClient.generate).mock.calls[1]
      const messages = secondCall[0]
      const toolResultMessage = messages.find((m: { content: string }) => m.content.includes('file1.txt'))
      expect(toolResultMessage).toBeDefined()
    })
  })
})
