import { program } from 'commander';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';

import { Brain } from './core/brain';
import { Events } from './core/events';
import { ollama } from './ollama';

// Modules
import { ExecutiveModule } from './core/modules/executive';
import { KnowledgeModule } from './core/modules/knowledge';
import { MemoryModule } from './core/modules/memory';
import { PersonalityModule } from './core/modules/personality';

// Input/Output
import { TextInput } from './core/inputs/text';
import { TextOutput } from './core/outputs/text';

dotenv.config({ path: '.env' });

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

program.version(packageJson.version).parse(process.argv);

function printBanner(): void {
    console.log(chalk.cyan(figlet.textSync('Albert', { horizontalLayout: 'full' })));
    console.log(chalk.gray(`v${packageJson.version} - An AI assistant with persistent memory\n`));
    console.log(chalk.gray('Type "exit" or "quit" to end the session.'));
    console.log(chalk.gray('Type "clear" to clear conversation memory.\n'));
}

async function main(): Promise<void> {
    const brain = new Brain();

    // Create modules
    const executiveModule = new ExecutiveModule(ollama);
    const knowledgeModule = new KnowledgeModule(ollama, './albert.db');
    const memoryModule = new MemoryModule(ollama, 20);
    const personalityModule = new PersonalityModule(ollama);

    // Register modules
    brain.registerModule(executiveModule);
    brain.registerModule(knowledgeModule);
    brain.registerModule(memoryModule);
    brain.registerModule(personalityModule);

    // Create and register input/output
    const textInput = new TextInput();
    const textOutput = new TextOutput();

    brain.registerInput(textInput);
    brain.registerOutput(textOutput);

    // Start the brain
    await brain.awake();

    // Print banner
    printBanner();

    // Setup graceful shutdown
    const shutdown = async (): Promise<void> => {
        console.log(chalk.yellow('\nShutting down Albert...'));
        await brain.sleep();
        console.log(chalk.green('Goodbye!'));
        process.exit(0);
    };

    process.on('SIGINT', () => { void shutdown(); });
    process.on('SIGTERM', () => { void shutdown(); });

    // REPL loop
    while (brain.isActive()) {
        try {
            const userInput = await input({
                message: chalk.blue('You:'),
            });

            const trimmed = userInput.trim().toLowerCase();

            // Handle commands
            if (trimmed === 'exit' || trimmed === 'quit') {
                await shutdown();
                break;
            }

            if (trimmed === 'clear') {
                await memoryModule.shutdown();
                memoryModule.init(brain);
                console.log(chalk.yellow('Conversation memory cleared.\n'));
                continue;
            }

            if (trimmed === '') {
                continue;
            }

            // Send input to brain
            textInput.send(userInput);

            // Wait for response before prompting again
            await new Promise<void>(resolve => {
                brain.once(Events.OutputReady, () => { resolve(); });
            });

        } catch (error) {
            if ((error as any).name === 'ExitPromptError') {
                // User pressed Ctrl+C during prompt
                await shutdown();
                break;
            }
            console.error(chalk.red('Error:'), error);
        }
    }
}

main().catch(console.error);
