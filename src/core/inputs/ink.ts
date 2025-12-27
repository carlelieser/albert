import { BaseInput } from './base';
import { Events } from '../events';

export class InkInput extends BaseInput {
    constructor() {
        super('ink');
    }

    send(text: string): void {
        this.emit(Events.InputReceived, { text });
    }
}
