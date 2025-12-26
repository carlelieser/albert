import type { ModelClient } from '../domain/ports/ModelClient'
import type { LearningService } from './LearningService'
import type { Message } from '../domain/models/Message'
import type { LearningCategory } from '../domain/models/Learning'

export interface LearningExtractor {
  extract(messages: readonly Message[]): Promise<void>
}

interface ExtractedLearning {
  content: string
  category?: string
}

const EXTRACTION_PROMPT = `Extract personal facts about the USER from this conversation.

OUTPUT FORMAT: JSON array only
[{"content": "User's name is X", "category": "fact"}]

CATEGORIES:
- fact: Name, job, location, relationships, personal details
- preference: Likes, dislikes, preferences
- style: How they communicate
- correction: When user corrected the assistant

EXAMPLE:
User: "I'm Carlos, a developer. My girlfriend Ana loves Python."
Output: [{"content": "User's name is Carlos", "category": "fact"}, {"content": "User is a developer", "category": "fact"}, {"content": "User's girlfriend is named Ana", "category": "fact"}, {"content": "User's girlfriend loves Python", "category": "fact"}]

CRITICAL RULES:
- ONLY extract facts about the USER or people the user mentions
- NEVER extract facts about the assistant/AI
- Return [] if no personal info shared
- Output ONLY valid JSON, nothing else`

const VALID_CATEGORIES = ['preference', 'fact', 'style', 'correction'] as const

function isValidCategory(category: string | undefined): category is LearningCategory {
  return category !== undefined && VALID_CATEGORIES.includes(category as LearningCategory)
}

function formatConversation(messages: readonly Message[]): string {
  return messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')
}

export function createLearningExtractor(
  modelClient: ModelClient,
  learningService: LearningService
): LearningExtractor {
  return {
    async extract(messages: readonly Message[]): Promise<void> {
      const conversationMessages = messages.filter(m => m.role !== 'system')

      if (conversationMessages.length === 0) {
        return
      }

      try {
        const conversation = formatConversation(conversationMessages)

        const extractionMessages = [
          {
            role: 'system',
            content: EXTRACTION_PROMPT
          },
          {
            role: 'user',
            content: `Conversation:\n${conversation}`
          }
        ]

        const response = await modelClient.generate(extractionMessages, () => {})
        const learnings = parseResponse(response)

        for (const learning of learnings) {
          if (!learning.content || learning.content.trim() === '') {
            continue
          }

          const category = isValidCategory(learning.category)
            ? learning.category
            : 'preference'

          await learningService.addLearning(learning.content, category)
        }
      } catch {
        // Silent - learning extraction should not break the chat
      }
    }
  }
}

function parseResponse(response: string): ExtractedLearning[] {
  try {
    const parsed = JSON.parse(response.trim())

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (item): item is ExtractedLearning =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.content === 'string'
    )
  } catch {
    return []
  }
}
