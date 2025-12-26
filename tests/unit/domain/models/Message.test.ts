import { describe, it, expect } from 'vitest'
import {
  createMessage,
  isUserMessage,
  isAssistantMessage,
  type Message
} from '../../../../src/domain/models/Message'

describe('Message', () => {
  describe('createMessage', () => {
    it('should create a user message with content', () => {
      const message = createMessage('user', 'Hello, Albert')

      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello, Albert')
    })

    it('should create an assistant message with content', () => {
      const message = createMessage('assistant', 'Hello! How can I help?')

      expect(message.role).toBe('assistant')
      expect(message.content).toBe('Hello! How can I help?')
    })

    it('should create a system message with content', () => {
      const message = createMessage('system', 'You are a helpful assistant')

      expect(message.role).toBe('system')
      expect(message.content).toBe('You are a helpful assistant')
    })

    it('should include a timestamp', () => {
      const before = new Date()
      const message = createMessage('user', 'test')
      const after = new Date()

      expect(message.timestamp).toBeInstanceOf(Date)
      expect(message.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(message.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('isUserMessage', () => {
    it('should return true for user messages', () => {
      const message = createMessage('user', 'Hello')
      expect(isUserMessage(message)).toBe(true)
    })

    it('should return false for non-user messages', () => {
      const assistant = createMessage('assistant', 'Hello')
      const system = createMessage('system', 'Hello')

      expect(isUserMessage(assistant)).toBe(false)
      expect(isUserMessage(system)).toBe(false)
    })
  })

  describe('isAssistantMessage', () => {
    it('should return true for assistant messages', () => {
      const message = createMessage('assistant', 'Hello')
      expect(isAssistantMessage(message)).toBe(true)
    })

    it('should return false for non-assistant messages', () => {
      const user = createMessage('user', 'Hello')
      const system = createMessage('system', 'Hello')

      expect(isAssistantMessage(user)).toBe(false)
      expect(isAssistantMessage(system)).toBe(false)
    })
  })
})
