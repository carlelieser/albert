import { describe, it, expect } from 'vitest'
import { loadConfiguration, DEFAULT_SYSTEM_PROMPT, DEFAULT_DATA_DIRECTORY } from '../../../src/application/Configuration'
import { homedir } from 'os'

describe('Configuration', () => {
  describe('loadConfiguration', () => {
    it('should load default values when env is empty', () => {
      const config = loadConfiguration({})

      expect(config.ollamaHost).toBe('http://localhost:11434')
      expect(config.modelName).toBe('llama3.1:8b')
      expect(config.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT)
      expect(config.dataDirectory).toBe(DEFAULT_DATA_DIRECTORY)
    })

    it('should load OLLAMA_HOST from environment', () => {
      const config = loadConfiguration({
        OLLAMA_HOST: 'http://custom:8080'
      })

      expect(config.ollamaHost).toBe('http://custom:8080')
    })

    it('should load ALBERT_MODEL from environment', () => {
      const config = loadConfiguration({
        ALBERT_MODEL: 'mistral'
      })

      expect(config.modelName).toBe('mistral')
    })

    it('should load both values from environment', () => {
      const config = loadConfiguration({
        OLLAMA_HOST: 'http://remote:11434',
        ALBERT_MODEL: 'codellama'
      })

      expect(config.ollamaHost).toBe('http://remote:11434')
      expect(config.modelName).toBe('codellama')
    })

    it('should use process.env when no env parameter provided', () => {
      const originalHost = process.env.OLLAMA_HOST
      const originalModel = process.env.ALBERT_MODEL

      try {
        delete process.env.OLLAMA_HOST
        delete process.env.ALBERT_MODEL

        const config = loadConfiguration()

        expect(config.ollamaHost).toBe('http://localhost:11434')
        expect(config.modelName).toBe('llama3.1:8b')
      } finally {
        if (originalHost) process.env.OLLAMA_HOST = originalHost
        if (originalModel) process.env.ALBERT_MODEL = originalModel
      }
    })

    it('should load ALBERT_SYSTEM_PROMPT from environment', () => {
      const customPrompt = 'You are a custom AI assistant.'
      const config = loadConfiguration({
        ALBERT_SYSTEM_PROMPT: customPrompt
      })

      expect(config.systemPrompt).toBe(customPrompt)
    })

    it('should load ALBERT_DATA_DIR from environment', () => {
      const config = loadConfiguration({
        ALBERT_DATA_DIR: '/custom/data/path'
      })

      expect(config.dataDirectory).toBe('/custom/data/path')
    })
  })

  describe('DEFAULT_SYSTEM_PROMPT', () => {
    it('should contain Albert identity', () => {
      expect(DEFAULT_SYSTEM_PROMPT).toContain('Albert')
    })

    it('should be a non-empty string', () => {
      expect(DEFAULT_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })
  })

  describe('DEFAULT_DATA_DIRECTORY', () => {
    it('should point to ~/.albert', () => {
      expect(DEFAULT_DATA_DIRECTORY).toBe(`${homedir()}/.albert`)
    })
  })
})
