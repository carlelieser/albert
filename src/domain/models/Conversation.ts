import type { Message } from './Message'

export interface Conversation {
  readonly messages: ReadonlyArray<Message>
  readonly createdAt: Date
}

export function createConversation(): Conversation {
  return {
    messages: [],
    createdAt: new Date()
  }
}

export function addMessage(conversation: Conversation, message: Message): Conversation {
  return {
    ...conversation,
    messages: [...conversation.messages, message]
  }
}

export function getLastMessage(conversation: Conversation): Message | undefined {
  return conversation.messages[conversation.messages.length - 1]
}

export function getMessageCount(conversation: Conversation): number {
  return conversation.messages.length
}

export function getMessages(conversation: Conversation): ReadonlyArray<Message> {
  return conversation.messages
}
