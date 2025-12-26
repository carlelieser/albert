export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  readonly role: MessageRole
  readonly content: string
  readonly timestamp: Date
}

export function createMessage(role: MessageRole, content: string): Message {
  return {
    role,
    content,
    timestamp: new Date()
  }
}

export function isUserMessage(message: Message): boolean {
  return message.role === 'user'
}

export function isAssistantMessage(message: Message): boolean {
  return message.role === 'assistant'
}
