import type { Command, CommandResult } from '../CommandRouter'
import type { LearningService } from '../../application/LearningService'

export function createLearnCommand(learningService: LearningService): Command {
  return {
    name: 'learn',

    async execute(args: string): Promise<CommandResult> {
      const content = args.trim()

      if (!content) {
        return {
          handled: true,
          output: 'Please provide something to learn. Usage: /learn <content>'
        }
      }

      const learning = await learningService.addLearning(content)

      return {
        handled: true,
        output: `Learned: "${learning.content}"`
      }
    }
  }
}
