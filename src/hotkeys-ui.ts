import { GamepadButtonConfig, RangeConfig } from './input-config';

import { InputManager } from './input-manager';
import { Pane } from 'tweakpane';

export type InputConfig = string | GamepadButtonConfig | RangeConfig;

export type ActionDefinition = {
    id: string;
    type: 'click';
    handler: () => unknown;
};

export class HotkeysUi {
    private im = new InputManager();
    constructor(
        private actions: ActionDefinition[],
        private defaultConfig: InputConfig[],
    ) {
        this.reset();
    }

    reset() {
        this.im.destroy();
        // rewire

        this.im.init();
    }

    destroy() {
        this.im.destroy();
    }

    openModal(container: HTMLElement) {
        const pane = new Pane({ container, title: 'Hotkeys UI' });
        pane.addBinding({ name: 'example', value: 10 }, 'value', { min: 0, max: 100 });
        const btn = pane.addButton({ title: 'Apply' });
        btn.on('click', () => {
            this.reset();
            pane.dispose();
        });
        // on modal close: this.reset()
        return pane;
    }
}
