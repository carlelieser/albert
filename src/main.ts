import path from 'node:path'
import { loadConfiguration } from './application/Configuration'
import { createChatSession } from './application/ChatSession'
import { createLearningService } from './application/LearningService'
import { createSystemPromptBuilder } from './application/SystemPromptBuilder'
import { createLearningExtractor } from './application/LearningExtractor'
import { createToolService } from './application/ToolService'
import { createOllamaClient } from './infrastructure/ollama/OllamaClient'
import { createConsoleInterface } from './infrastructure/console/ConsoleInterface'
import { createNodeFileSystem } from './infrastructure/filesystem/NodeFileSystem'
import { createJsonLearningRepository } from './infrastructure/persistence/JsonLearningRepository'
import { createInMemoryToolRegistry } from './infrastructure/registry/InMemoryToolRegistry'
import { createBashTool } from './infrastructure/tools/BashTool'
import { createReadFileTool } from './infrastructure/tools/ReadFileTool'
import { createWriteFileTool } from './infrastructure/tools/WriteFileTool'
import { createListDirectoryTool } from './infrastructure/tools/ListDirectoryTool'
import { createHttpRequestTool } from './infrastructure/tools/HttpRequestTool'
import { createSignalHandler } from './presentation/SignalHandler'
import { createRepl } from './presentation/Repl'
import { createCommandRouter } from './presentation/CommandRouter'
import { createLearnCommand } from './presentation/commands/LearnCommand'
import { createForgetCommand } from './presentation/commands/ForgetCommand'
import { createListLearningsCommand } from './presentation/commands/ListLearningsCommand'

async function main(): Promise<void> {
  const config = loadConfiguration()

  // Infrastructure layer
  const fileSystem = createNodeFileSystem()
  const learningsPath = path.join(config.dataDirectory, 'learnings.json')
  const learningRepository = createJsonLearningRepository(fileSystem, learningsPath)

  // Tool registry with base tools
  const toolRegistry = createInMemoryToolRegistry()
  toolRegistry.register(createBashTool())
  toolRegistry.register(createReadFileTool())
  toolRegistry.register(createWriteFileTool())
  toolRegistry.register(createListDirectoryTool())
  toolRegistry.register(createHttpRequestTool())

  // Application layer
  const learningService = createLearningService(learningRepository)
  const toolService = createToolService({ registry: toolRegistry })
  const systemPromptBuilder = createSystemPromptBuilder(config.systemPrompt, learningService, toolService)

  // Presentation layer - Command router with commands
  const commandRouter = createCommandRouter()
  commandRouter.register(createLearnCommand(learningService))
  commandRouter.register(createForgetCommand(learningService))
  commandRouter.register(createListLearningsCommand(learningService))

  // Create core components
  const modelClient = createOllamaClient(config.ollamaHost)
  const userInterface = createConsoleInterface(process.stdin, process.stdout)
  const learningExtractor = createLearningExtractor(modelClient, learningService)
  const chatSession = createChatSession(modelClient, userInterface, config, systemPromptBuilder, learningExtractor, toolService)
  const repl = createRepl(chatSession, userInterface, commandRouter)
  const signalHandler = createSignalHandler()

  signalHandler.register(async () => {
    await repl.stop()
  })

  try {
    await repl.run()
  } finally {
    signalHandler.unregister()
  }
}

main().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
