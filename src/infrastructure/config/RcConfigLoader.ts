import os from 'node:os'
import path from 'node:path'
import type { FileSystem } from '../../domain/ports/FileSystem'
import type { AlbertConfig, ConfigLoader } from '../../domain/ports/ConfigLoader'

const homeDir = os.homedir()

export const DEFAULT_CONFIG: AlbertConfig = Object.freeze({
  ollamaHost: 'http://localhost:11434',
  modelName: 'llama3.2',
  systemPrompt: '',
  dataDirectory: path.join(homeDir, '.albert')
})

function expandTilde(value: string): string {
  if (value.startsWith('~/')) {
    return path.join(homeDir, value.slice(2))
  }
  if (value === '~') {
    return homeDir
  }
  return value
}

interface PartialConfig {
  ollamaHost?: string
  modelName?: string
  systemPrompt?: string
  dataDirectory?: string
}

export function createRcConfigLoader(fileSystem: FileSystem): ConfigLoader {
  const rcFilePath = path.join(homeDir, '.albertrc')

  return {
    async load(): Promise<AlbertConfig> {
      const exists = await fileSystem.exists(rcFilePath)
      if (!exists) {
        return DEFAULT_CONFIG
      }

      try {
        const content = await fileSystem.readFile(rcFilePath)
        const parsed: PartialConfig = JSON.parse(content)

        const config: AlbertConfig = {
          ollamaHost: parsed.ollamaHost
            ? expandTilde(parsed.ollamaHost)
            : DEFAULT_CONFIG.ollamaHost,
          modelName: parsed.modelName ?? DEFAULT_CONFIG.modelName,
          systemPrompt: parsed.systemPrompt ?? DEFAULT_CONFIG.systemPrompt,
          dataDirectory: parsed.dataDirectory
            ? expandTilde(parsed.dataDirectory)
            : DEFAULT_CONFIG.dataDirectory
        }

        return config
      } catch {
        return DEFAULT_CONFIG
      }
    }
  }
}
