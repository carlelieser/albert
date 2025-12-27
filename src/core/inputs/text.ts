import { BaseInput } from './base';
import { Events } from '../events';

export class TextInput extends BaseInput {
    constructor() {
        super('text');
    }

    send(text: string): void {
        this.emit(Events.InputReceived, { text });
    }
}
