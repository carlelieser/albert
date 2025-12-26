import type { ModelClient, StreamChunk } from '../../domain/ports/ModelClient'

export function createOllamaClient(host: string): ModelClient {
  let connected = false
  let modelLoaded = false
  let currentModel = ''

  async function streamRequest(
    endpoint: string,
    body: object,
    onChunk?: (chunk: StreamChunk) => void
  ): Promise<string> {
    const response = await fetch(`${host}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      let errorMessage = `Ollama request failed: ${response.status}`
      try {
        const errorJson = JSON.parse(errorBody)
        if (errorJson.error) {
          errorMessage = errorJson.error
        }
      } catch {
        if (errorBody) {
          errorMessage = errorBody
        }
      }
      throw new Error(errorMessage)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        const parsed = JSON.parse(line)

        if (parsed.message?.content) {
          fullResponse += parsed.message.content
          onChunk?.({
            content: parsed.message.content,
            done: parsed.done ?? false
          })
        }
      }
    }

    return fullResponse
  }

  return {
    async connect(): Promise<void> {
      try {
        const response = await fetch(`${host}/api/version`)
        if (!response.ok) {
          throw new Error('Server returned error')
        }
        connected = true
      } catch (error) {
        throw new Error(
          `Failed to connect to Ollama at ${host}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    },

    async loadModel(modelName: string): Promise<void> {
      currentModel = modelName
      await streamRequest('/api/generate', {
        model: modelName,
        prompt: '',
        keep_alive: -1
      })
      modelLoaded = true
    },

    async generate(
      messages: Array<{ role: string; content: string }>,
      onChunk: (chunk: StreamChunk) => void
    ): Promise<string> {
      return streamRequest('/api/chat', {
        model: currentModel,
        messages,
        stream: true
      }, onChunk)
    },

    async unloadModel(): Promise<void> {
      await streamRequest('/api/generate', {
        model: currentModel,
        prompt: '',
        keep_alive: 0
      })
      modelLoaded = false
    },

    async disconnect(): Promise<void> {
      connected = false
    },

    isConnected(): boolean {
      return connected
    },

    isModelLoaded(): boolean {
      return modelLoaded
    }
  }
}
