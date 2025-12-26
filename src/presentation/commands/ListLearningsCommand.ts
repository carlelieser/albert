import type { Command, CommandResult } from '../CommandRouter'
import type { LearningService } from '../../application/LearningService'

export function createListLearningsCommand(learningService: LearningService): Command {
  return {
    name: 'learnings',

    async execute(_args: string): Promise<CommandResult> {
      const learnings = await learningService.getLearnings()

      if (learnings.length === 0) {
        return {
          handled: true,
          output: 'No learnings yet. Use /learn <content> to add one.'
        }
      }

      const lines = [
        `Learnings (${learnings.length}):`,
        '',
        ...learnings.map(l => `  [${l.id}] ${l.content}`)
      ]

      return {
        handled: true,
        output: lines.join('\n')
      }
    }
  }
}
