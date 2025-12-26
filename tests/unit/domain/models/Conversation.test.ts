import { describe, it, expect } from 'vitest'
import {
  createConversation,
  addMessage,
  getLastMessage,
  getMessageCount,
  getMessages
} from '../../../../src/domain/models/Conversation'
import { createMessage } from '../../../../src/domain/models/Message'

describe('Conversation', () => {
  describe('createConversation', () => {
    it('should create an empty conversation', () => {
      const conversation = createConversation()

      expect(getMessageCount(conversation)).toBe(0)
      expect(getMessages(conversation)).toEqual([])
    })

    it('should include a creation timestamp', () => {
      const before = new Date()
      const conversation = createConversation()
      const after = new Date()

      expect(conversation.createdAt).toBeInstanceOf(Date)
      expect(conversation.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(conversation.createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('addMessage', () => {
    it('should add a message to the conversation', () => {
      const conversation = createConversation()
      const message = createMessage('user', 'Hello')

      const updated = addMessage(conversation, message)

      expect(getMessageCount(updated)).toBe(1)
      expect(getMessages(updated)[0]).toEqual(message)
    })

    it('should be immutable - original conversation unchanged', () => {
      const original = createConversation()
      const message = createMessage('user', 'Hello')

      const updated = addMessage(original, message)

      expect(getMessageCount(original)).toBe(0)
      expect(getMessageCount(updated)).toBe(1)
    })

    it('should preserve message order', () => {
      let conversation = createConversation()
      const msg1 = createMessage('user', 'First')
      const msg2 = createMessage('assistant', 'Second')
      const msg3 = createMessage('user', 'Third')

      conversation = addMessage(conversation, msg1)
      conversation = addMessage(conversation, msg2)
      conversation = addMessage(conversation, msg3)

      const messages = getMessages(conversation)
      expect(messages[0].content).toBe('First')
      expect(messages[1].content).toBe('Second')
      expect(messages[2].content).toBe('Third')
    })
  })

  describe('getLastMessage', () => {
    it('should return undefined for empty conversation', () => {
      const conversation = createConversation()

      expect(getLastMessage(conversation)).toBeUndefined()
    })

    it('should return the last added message', () => {
      let conversation = createConversation()
      const msg1 = createMessage('user', 'First')
      const msg2 = createMessage('assistant', 'Last')

      conversation = addMessage(conversation, msg1)
      conversation = addMessage(conversation, msg2)

      expect(getLastMessage(conversation)?.content).toBe('Last')
    })
  })

  describe('getMessageCount', () => {
    it('should return correct count', () => {
      let conversation = createConversation()

      expect(getMessageCount(conversation)).toBe(0)

      conversation = addMessage(conversation, createMessage('user', '1'))
      expect(getMessageCount(conversation)).toBe(1)

      conversation = addMessage(conversation, createMessage('assistant', '2'))
      expect(getMessageCount(conversation)).toBe(2)
    })
  })
})
