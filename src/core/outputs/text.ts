import { BaseOutput } from './base';
import type { BrainEvent } from '../brain';
import chalk from 'chalk';

export type OutputCallback = (text: string) => void;

export class TextOutput extends BaseOutput {
    private callback: OutputCallback | null = null;

    constructor() {
        super('text');
    }

    setCallback(callback: OutputCallback): void {
        this.callback = callback;
    }

    handleOutput(event: BrainEvent): void {
        const data = event.data as { text: string };
        const text = data.text;

        if (this.callback) {
            this.callback(text);
        } else {
            // Default: print to console with formatting
            console.log(chalk.green('\nAlbert: ') + text + '\n');
        }
    }

    shutdown(): void {
        this.callback = null;
        super.shutdown();
    }
}
