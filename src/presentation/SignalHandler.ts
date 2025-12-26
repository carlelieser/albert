export interface SignalHandler {
  register(onSignal: () => Promise<void>): void
  unregister(): void
}

export function createSignalHandler(): SignalHandler {
  let sigintHandler: (() => void) | null = null
  let sigtermHandler: (() => void) | null = null

  return {
    register(onSignal: () => Promise<void>): void {
      const handler = async () => {
        await onSignal()
      }

      sigintHandler = handler
      sigtermHandler = handler

      process.on('SIGINT', sigintHandler)
      process.on('SIGTERM', sigtermHandler)
    },

    unregister(): void {
      if (sigintHandler) {
        process.removeListener('SIGINT', sigintHandler)
      }
      if (sigtermHandler) {
        process.removeListener('SIGTERM', sigtermHandler)
      }
      sigintHandler = null
      sigtermHandler = null
    }
  }
}
