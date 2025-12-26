import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRcConfigLoader, DEFAULT_CONFIG } from '../../../../src/infrastructure/config/RcConfigLoader'
import type { FileSystem } from '../../../../src/domain/ports/FileSystem'
import os from 'node:os'

describe('RcConfigLoader', () => {
  const mockFileSystem: FileSystem = {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    exists: vi.fn(),
    mkdir: vi.fn()
  }

  const homeDir = os.homedir()
  const rcFilePath = `${homeDir}/.albertrc`

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('load', () => {
    it('should return defaults when file does not exist', async () => {
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(false)

      const loader = createRcConfigLoader(mockFileSystem)
      const config = await loader.load()

      expect(config).toEqual(DEFAULT_CONFIG)
    })

    it('should check for .albertrc in home directory', async () => {
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(false)

      const loader = createRcConfigLoader(mockFileSystem)
      await loader.load()

      expect(mockFileSystem.exists).toHaveBeenCalledWith(rcFilePath)
    })

    it('should merge file config with defaults', async () => {
      const fileConfig = { modelName: 'custom-model' }
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(JSON.stringify(fileConfig))

      const loader = createRcConfigLoader(mockFileSystem)
      const config = await loader.load()

      expect(config.modelName).toBe('custom-model')
      expect(config.ollamaHost).toBe(DEFAULT_CONFIG.ollamaHost)
      expect(config.systemPrompt).toBe(DEFAULT_CONFIG.systemPrompt)
      expect(config.dataDirectory).toBe(DEFAULT_CONFIG.dataDirectory)
    })

    it('should override all default values when specified', async () => {
      const fileConfig = {
        ollamaHost: 'http://custom:1234',
        modelName: 'llama4',
        systemPrompt: 'You are a helpful assistant.',
        dataDirectory: '/custom/data'
      }
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(JSON.stringify(fileConfig))

      const loader = createRcConfigLoader(mockFileSystem)
      const config = await loader.load()

      expect(config).toEqual(fileConfig)
    })

    it('should expand tilde in dataDirectory', async () => {
      const fileConfig = { dataDirectory: '~/.albert/data' }
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(JSON.stringify(fileConfig))

      const loader = createRcConfigLoader(mockFileSystem)
      const config = await loader.load()

      expect(config.dataDirectory).toBe(`${homeDir}/.albert/data`)
    })

    it('should expand tilde in ollamaHost', async () => {
      const fileConfig = { ollamaHost: '~/socket.sock' }
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(JSON.stringify(fileConfig))

      const loader = createRcConfigLoader(mockFileSystem)
      const config = await loader.load()

      expect(config.ollamaHost).toBe(`${homeDir}/socket.sock`)
    })

    it('should return defaults for invalid JSON', async () => {
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce('invalid json {{{')

      const loader = createRcConfigLoader(mockFileSystem)
      const config = await loader.load()

      expect(config).toEqual(DEFAULT_CONFIG)
    })

    it('should ignore unknown properties', async () => {
      const fileConfig = {
        modelName: 'valid-model',
        unknownProperty: 'should be ignored'
      }
      vi.mocked(mockFileSystem.exists).mockResolvedValueOnce(true)
      vi.mocked(mockFileSystem.readFile).mockResolvedValueOnce(JSON.stringify(fileConfig))

      const loader = createRcConfigLoader(mockFileSystem)
      const config = await loader.load()

      expect(config.modelName).toBe('valid-model')
      expect((config as any).unknownProperty).toBeUndefined()
    })
  })

  describe('DEFAULT_CONFIG', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_CONFIG.ollamaHost).toBe('http://localhost:11434')
      expect(DEFAULT_CONFIG.modelName).toBe('llama3.2')
      expect(DEFAULT_CONFIG.systemPrompt).toBe('')
      expect(DEFAULT_CONFIG.dataDirectory).toBe(`${homeDir}/.albert`)
    })
  })
})
