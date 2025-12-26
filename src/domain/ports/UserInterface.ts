export interface UserInterface {
  prompt(message: string): Promise<string | null>
  write(text: string): void
  writeLine(text: string): void
  close(): void
}
