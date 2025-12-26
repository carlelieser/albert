export interface AlbertConfig {
  readonly ollamaHost: string
  readonly modelName: string
  readonly systemPrompt: string
  readonly dataDirectory: string
}

export interface ConfigLoader {
  load(): Promise<AlbertConfig>
}
