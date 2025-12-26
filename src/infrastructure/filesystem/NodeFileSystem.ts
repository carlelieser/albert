import * as fs from 'node:fs/promises'
import type { FileSystem } from '../../domain/ports/FileSystem'

export function createNodeFileSystem(): FileSystem {
  return {
    async readFile(path: string): Promise<string> {
      return fs.readFile(path, 'utf-8')
    },

    async writeFile(path: string, content: string): Promise<void> {
      await fs.writeFile(path, content, 'utf-8')
    },

    async exists(path: string): Promise<boolean> {
      try {
        await fs.access(path)
        return true
      } catch {
        return false
      }
    },

    async mkdir(path: string): Promise<void> {
      await fs.mkdir(path, { recursive: true })
    }
  }
}
