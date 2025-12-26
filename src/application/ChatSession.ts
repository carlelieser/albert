import type { ModelClient, StreamChunk } from '../domain/ports/ModelClient'
import type { UserInterface } from '../domain/ports/UserInterface'
import type { AlbertConfiguration } from './Configuration'
import type { SystemPromptBuilder } from './SystemPromptBuilder'
import type { LearningExtractor } from './LearningExtractor'
import type { ToolService, ToolExecutionResult } from './ToolService'
import {
  createConversation,
  addMessage,
  createMessage,
  getMessages,
  type Conversation
} from '../domain'

export interface ChatSession {
  start(): Promise<void>
  sendMessage(userInput: string): Promise<void>
  end(): Promise<void>
  isActive(): boolean
}

export function createChatSession(
  modelClient: ModelClient,
  userInterface: UserInterface,
  config: AlbertConfiguration,
  systemPromptBuilder: SystemPromptBuilder,
  learningExtractor?: LearningExtractor,
  toolService?: ToolService
): ChatSession {
  let active = false
  let conversation: Conversation = createConversation()

  async function generateAndProcessTools(systemPrompt: string): Promise<string> {
    const systemMessage = { role: 'system', content: systemPrompt }
    const conversationMessages = getMessages(conversation).map(msg => ({
      role: msg.role,
      content: msg.content
    }))

    const messages = [systemMessage, ...conversationMessages]

    let fullResponse = ''
    const response = await modelClient.generate(messages, (chunk: StreamChunk) => {
      userInterface.write(chunk.content)
      fullResponse += chunk.content
    })

    userInterface.writeLine('')

    const finalResponse = response || fullResponse
    const assistantMessage = createMessage('assistant', finalResponse)
    conversation = addMessage(conversation, assistantMessage)

    if (toolService) {
      const toolResults = await toolService.processResponse(finalResponse)

      if (toolResults.length > 0) {
        displayToolResults(toolResults)
        injectToolResultsIntoConversation(toolResults)
        return generateAndProcessTools(systemPrompt)
      }
    }

    return finalResponse
  }

  function displayToolResults(results: ToolExecutionResult[]): void {
    for (const result of results) {
      userInterface.writeLine(`[Tool: ${result.toolName}]`)
      if (result.result.success) {
        userInterface.writeLine(result.result.output)
      } else {
        userInterface.writeLine(`Error: ${result.result.error}`)
      }
    }
  }

  function injectToolResultsIntoConversation(results: ToolExecutionResult[]): void {
    const toolResultContent = results
      .map(r => {
        const status = r.result.success ? 'Success' : 'Error'
        const output = r.result.success ? r.result.output : r.result.error
        return `Tool "${r.toolName}" result (${status}):\n${output}`
      })
      .join('\n\n')

    const toolResultMessage = createMessage('user', `[Tool Results]\n${toolResultContent}`)
    conversation = addMessage(conversation, toolResultMessage)
  }

  return {
    async start(): Promise<void> {
      await modelClient.connect()
      userInterface.writeLine(`Loading model ${config.modelName}...`)
      await modelClient.loadModel(config.modelName)
      userInterface.writeLine('Model ready.')
      active = true
    },

    async sendMessage(userInput: string): Promise<void> {
      const userMessage = createMessage('user', userInput)
      conversation = addMessage(conversation, userMessage)

      const systemPrompt = await systemPromptBuilder.build()
      await generateAndProcessTools(systemPrompt)

      if (learningExtractor) {
        try {
          await learningExtractor.extract(getMessages(conversation))
        } catch {
          // Learning extraction should not break the chat
        }
      }
    },

    async end(): Promise<void> {
      userInterface.writeLine('Unloading model...')
      await modelClient.unloadModel()
      await modelClient.disconnect()
      userInterface.writeLine('Goodbye.')
      active = false
    },

    isActive(): boolean {
      return active
    }
  }
}
