import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHttpRequestTool } from '../../../../src/infrastructure/tools/HttpRequestTool'

describe('HttpRequestTool', () => {
  const httpTool = createHttpRequestTool()
  const originalFetch = global.fetch

  beforeEach(() => {
    global.fetch = vi.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('definition', () => {
    it('should have correct name', () => {
      expect(httpTool.definition.name).toBe('http_request')
    })

    it('should have url parameter', () => {
      const urlParam = httpTool.definition.parameters.find(p => p.name === 'url')
      expect(urlParam).toBeDefined()
      expect(urlParam?.required).toBe(true)
    })

    it('should have optional method parameter', () => {
      const methodParam = httpTool.definition.parameters.find(p => p.name === 'method')
      expect(methodParam).toBeDefined()
      expect(methodParam?.required).toBe(false)
      expect(methodParam?.defaultValue).toBe('GET')
    })

    it('should have optional body parameter', () => {
      const bodyParam = httpTool.definition.parameters.find(p => p.name === 'body')
      expect(bodyParam).toBeDefined()
      expect(bodyParam?.required).toBe(false)
    })

    it('should have optional headers parameter', () => {
      const headersParam = httpTool.definition.parameters.find(p => p.name === 'headers')
      expect(headersParam).toBeDefined()
      expect(headersParam?.required).toBe(false)
    })

    it('should have optional timeout parameter', () => {
      const timeoutParam = httpTool.definition.parameters.find(p => p.name === 'timeout')
      expect(timeoutParam).toBeDefined()
      expect(timeoutParam?.required).toBe(false)
      expect(timeoutParam?.defaultValue).toBe(30000)
    })
  })

  describe('execute', () => {
    it('should make GET request by default', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('response body')
      } as Response)

      const result = await httpTool.execute({ url: 'https://example.com/api' })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.success).toBe(true)
      expect(result.output).toContain('response body')
    })

    it('should make POST request with body', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 201,
        text: () => Promise.resolve('{"id": 1}')
      } as Response)

      const result = await httpTool.execute({
        url: 'https://example.com/api',
        method: 'POST',
        body: '{"name": "test"}',
        headers: { 'Content-Type': 'application/json' }
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/api',
        expect.objectContaining({
          method: 'POST',
          body: '{"name": "test"}',
          headers: { 'Content-Type': 'application/json' }
        })
      )
      expect(result.success).toBe(true)
    })

    it('should return error for failed request', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Not found')
      } as Response)

      const result = await httpTool.execute({ url: 'https://example.com/missing' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('404')
    })

    it('should return error for network failure', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      const result = await httpTool.execute({ url: 'https://example.com/api' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should include status code in output', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK')
      } as Response)

      const result = await httpTool.execute({ url: 'https://example.com' })

      expect(result.output).toContain('200')
    })
  })
})
