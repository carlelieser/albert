import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSignalHandler } from '../../../src/presentation/SignalHandler'

describe('SignalHandler', () => {
  const originalOn = process.on
  const originalRemoveListener = process.removeListener
  let registeredHandlers: Map<string, Function[]>

  beforeEach(() => {
    registeredHandlers = new Map()

    process.on = vi.fn((signal: string, handler: Function) => {
      if (!registeredHandlers.has(signal)) {
        registeredHandlers.set(signal, [])
      }
      registeredHandlers.get(signal)!.push(handler)
      return process
    }) as typeof process.on

    process.removeListener = vi.fn((signal: string, handler: Function) => {
      const handlers = registeredHandlers.get(signal)
      if (handlers) {
        const index = handlers.indexOf(handler)
        if (index > -1) {
          handlers.splice(index, 1)
        }
      }
      return process
    }) as typeof process.removeListener
  })

  afterEach(() => {
    process.on = originalOn
    process.removeListener = originalRemoveListener
  })

  describe('register', () => {
    it('should register SIGINT handler', () => {
      const handler = createSignalHandler()

      handler.register(async () => {})

      expect(registeredHandlers.has('SIGINT')).toBe(true)
      expect(registeredHandlers.get('SIGINT')!.length).toBe(1)
    })

    it('should register SIGTERM handler', () => {
      const handler = createSignalHandler()

      handler.register(async () => {})

      expect(registeredHandlers.has('SIGTERM')).toBe(true)
      expect(registeredHandlers.get('SIGTERM')!.length).toBe(1)
    })

    it('should call callback on SIGINT', async () => {
      const callback = vi.fn().mockResolvedValue(undefined)
      const handler = createSignalHandler()
      handler.register(callback)

      const sigintHandler = registeredHandlers.get('SIGINT')![0]
      await sigintHandler()

      expect(callback).toHaveBeenCalled()
    })

    it('should call callback on SIGTERM', async () => {
      const callback = vi.fn().mockResolvedValue(undefined)
      const handler = createSignalHandler()
      handler.register(callback)

      const sigtermHandler = registeredHandlers.get('SIGTERM')![0]
      await sigtermHandler()

      expect(callback).toHaveBeenCalled()
    })
  })

  describe('unregister', () => {
    it('should remove all signal handlers', () => {
      const handler = createSignalHandler()
      handler.register(async () => {})

      expect(registeredHandlers.get('SIGINT')!.length).toBe(1)

      handler.unregister()

      expect(process.removeListener).toHaveBeenCalledWith('SIGINT', expect.any(Function))
      expect(process.removeListener).toHaveBeenCalledWith('SIGTERM', expect.any(Function))
    })
  })
})
