import type { LearningService } from './LearningService'
import type { ToolService } from './ToolService'
import type { ToolDefinition, ToolParameter } from '../domain/models/Tool'

export interface SystemPromptBuilder {
  build(): Promise<string>
}

function formatParameter(param: ToolParameter): string {
  const requiredLabel = param.required ? '(required)' : '(optional)'
  return `    - ${param.name}: ${param.type} ${requiredLabel} - ${param.description}`
}

function formatToolDefinition(tool: ToolDefinition): string {
  const params = tool.parameters.length > 0
    ? '\n' + tool.parameters.map(formatParameter).join('\n')
    : ''
  return `- ${tool.name}: ${tool.description}${params}`
}

function buildToolsSection(toolService: ToolService): string {
  const tools = toolService.getToolDescriptions()

  if (tools.length === 0) {
    return ''
  }

  const toolsList = tools.map(formatToolDefinition).join('\n\n')

  return `
[Available Tools]
${toolsList}

To use a tool, respond with:
<tool_call>
{"name": "tool_name", "arguments": {"param": "value"}}
</tool_call>

You can use multiple tools. Wait for each result before proceeding.`
}

export function createSystemPromptBuilder(
  basePrompt: string,
  learningService: LearningService,
  toolService?: ToolService
): SystemPromptBuilder {
  return {
    async build(): Promise<string> {
      let prompt = basePrompt

      if (toolService) {
        const toolsSection = buildToolsSection(toolService)
        if (toolsSection) {
          prompt += toolsSection
        }
      }

      const learnings = await learningService.getLearnings()

      if (learnings.length > 0) {
        const learningsList = learnings
          .map(learning => `- ${learning.content}`)
          .join('\n')

        prompt += `

[What I've learned about you]:
${learningsList}`
      }

      return prompt
    }
  }
}
