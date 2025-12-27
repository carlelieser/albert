import { BaseOutput } from './base';
import type { Brain, BrainEvent } from '../brain';
import { Events } from '../events';
import chalk from 'chalk';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked with terminal renderer
marked.setOptions({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    renderer: new TerminalRenderer({
        code: chalk.yellow,
        codespan: chalk.yellow,
        strong: chalk.bold,
        em: chalk.italic,
        heading: chalk.bold.cyan,
        listitem: chalk.green,
    }),
});

export class TextOutput extends BaseOutput {
    private isFirstChunk = true;
    private hasStreamed = false;

    constructor() {
        super('text');
    }

    init(brain: Brain): void {
        super.init(brain);

        // Also listen for streaming chunks
        this.brain!.on(Events.OutputChunk, (event: BrainEvent) => {
            this.handleChunk(event);
        });
    }

    handleChunk(event: BrainEvent): void {
        const data = event.data as { text: string; done: boolean };
        this.hasStreamed = true;

        // Emit stream start event on first chunk
        if (this.isFirstChunk) {
            this.brain!.emit(Events.OutputStreamStart, {});
            process.stdout.write(chalk.green('Albert: '));
            this.isFirstChunk = false;
        }
        process.stdout.write(data.text);
        if (data.done) {
            process.stdout.write('\n');
            this.isFirstChunk = true;
        }
    }

    handleOutput(event: BrainEvent): void {
        const data = event.data as { text: string };
        const text = data.text;

        if (!this.hasStreamed) {
            // Only print if we didn't stream (fallback for non-streaming)
            const rendered = marked.parse(text) as string;
            console.log(chalk.green('\nAlbert: ') + rendered.trim() + '\n');
        }
        // Reset for next message
        this.isFirstChunk = true;
        this.hasStreamed = false;
    }

    shutdown(): void {
        this.isFirstChunk = true;
        this.hasStreamed = false;
        super.shutdown();
    }
}
