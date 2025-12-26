import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createOllamaClient } from '../../../../src/infrastructure/ollama/OllamaClient'
import type { StreamChunk } from '../../../../src/domain/ports/ModelClient'

describe('OllamaClient', () => {
  const mockFetch = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = mockFetch
    mockFetch.mockReset()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('connect', () => {
    it('should verify server is reachable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '0.1.0' })
      })

      const client = createOllamaClient('http://localhost:11434')
      await client.connect()

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/version')
      expect(client.isConnected()).toBe(true)
    })

    it('should throw error if server is not reachable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'))

      const client = createOllamaClient('http://localhost:11434')

      await expect(client.connect()).rejects.toThrow('Failed to connect to Ollama')
    })
  })

  describe('loadModel', () => {
    it('should load model with keep_alive', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([{ done: true }])
        })

      const client = createOllamaClient('http://localhost:11434')
      await client.connect()
      await client.loadModel('llama3.2')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"keep_alive":-1')
        })
      )
      expect(client.isModelLoaded()).toBe(true)
    })
  })

  describe('generate', () => {
    it('should stream response chunks', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([{ done: true }])
        })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([
            { message: { content: 'Hello' }, done: false },
            { message: { content: ' World' }, done: true }
          ])
        })

      const client = createOllamaClient('http://localhost:11434')
      await client.connect()
      await client.loadModel('llama3.2')

      const chunks: StreamChunk[] = []
      await client.generate(
        [{ role: 'user', content: 'Hi' }],
        (chunk) => chunks.push(chunk)
      )

      expect(chunks).toHaveLength(2)
      expect(chunks[0]).toEqual({ content: 'Hello', done: false })
      expect(chunks[1]).toEqual({ content: ' World', done: true })
    })

    it('should return full response', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([{ done: true }])
        })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([
            { message: { content: 'Hello' }, done: false },
            { message: { content: ' World' }, done: true }
          ])
        })

      const client = createOllamaClient('http://localhost:11434')
      await client.connect()
      await client.loadModel('llama3.2')

      const response = await client.generate(
        [{ role: 'user', content: 'Hi' }],
        () => {}
      )

      expect(response).toBe('Hello World')
    })

    it('should send conversation history', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([{ done: true }])
        })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([{ message: { content: 'Response' }, done: true }])
        })

      const client = createOllamaClient('http://localhost:11434')
      await client.connect()
      await client.loadModel('llama3.2')

      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'How are you?' }
      ]

      await client.generate(messages, () => {})

      const generateCall = mockFetch.mock.calls[2]
      const body = JSON.parse(generateCall[1].body)
      expect(body.messages).toEqual(messages)
    })
  })

  describe('unloadModel', () => {
    it('should unload model with keep_alive 0', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([{ done: true }])
        })
        .mockResolvedValueOnce({
          ok: true,
          body: createMockStream([{ done: true }])
        })

      const client = createOllamaClient('http://localhost:11434')
      await client.connect()
      await client.loadModel('llama3.2')
      await client.unloadModel()

      const unloadCall = mockFetch.mock.calls[2]
      const body = JSON.parse(unloadCall[1].body)
      expect(body.keep_alive).toBe(0)
      expect(client.isModelLoaded()).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('should mark client as disconnected', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })

      const client = createOllamaClient('http://localhost:11434')
      await client.connect()
      expect(client.isConnected()).toBe(true)

      await client.disconnect()
      expect(client.isConnected()).toBe(false)
    })
  })
})

function createMockStream(chunks: object[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        const line = JSON.stringify(chunks[index]) + '\n'
        controller.enqueue(encoder.encode(line))
        index++
      } else {
        controller.close()
      }
    }
  })
}
