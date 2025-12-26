import type { Command, CommandResult } from '../CommandRouter'
import type { LearningService } from '../../application/LearningService'

export function createForgetCommand(learningService: LearningService): Command {
  return {
    name: 'forget',

    async execute(args: string): Promise<CommandResult> {
      const target = args.trim()

      if (!target) {
        return {
          handled: true,
          output: 'Usage: /forget <id> or /forget all'
        }
      }

      if (target.toLowerCase() === 'all') {
        await learningService.clearLearnings()
        return {
          handled: true,
          output: 'Forgotten all learnings.'
        }
      }

      const removed = await learningService.removeLearning(target)

      if (!removed) {
        return {
          handled: true,
          output: `Learning with id "${target}" not found.`
        }
      }

      return {
        handled: true,
        output: `Forgotten learning with id "${target}".`
      }
    }
  }
}
