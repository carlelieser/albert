export interface StreamChunk {
  readonly content: string
  readonly done: boolean
}

export interface ModelClient {
  connect(): Promise<void>
  loadModel(modelName: string): Promise<void>
  generate(
    messages: Array<{ role: string; content: string }>,
    onChunk: (chunk: StreamChunk) => void
  ): Promise<string>
  unloadModel(): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  isModelLoaded(): boolean
}
