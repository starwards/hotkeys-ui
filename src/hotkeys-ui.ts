import { GamepadButtonConfig, RangeConfig, isButtonConfig } from './input-config';

import { InputManager } from './input-manager';
import hotkeys from 'hotkeys-js';

export type InputConfig = string | GamepadButtonConfig | RangeConfig;
export type ConfigState = Record<string, InputConfig | undefined>;
export type ActionDefinition = {
    id: string;
    type: 'click';
    handler: () => unknown;
};

function printButtonConfig(c: InputConfig | undefined) {
    if (!isButtonConfig(c)) return ' ';
    if (typeof c === 'string') return c || ' ';
    const gamepads = mmk.gamepad.getRawGamepads().filter((g): g is mmk.gamepad.Gamepad => !!g);
    const gamepad = gamepads[c.gamepadIndex];
    return `button ${c.buttonIndex} on ${gamepad.displayId || gamepad.id}`;
}

const NOOP = () => undefined as unknown;

export class HotkeysUi {
    private inputManager = new InputManager();
    private keysConfig: ConfigState = {};
    private paneCleanup = NOOP;
    private stopRecording = NOOP;

    constructor(private actions: ActionDefinition[]) {
        this.reset();
    }

    reset() {
        this.paneCleanup();
        this.inputManager.destroy();
        for (const ad of this.actions) {
            const state = this.keysConfig[ad.id];
            if (isButtonConfig(state)) {
                this.inputManager.addClickAction(ad.handler, state);
            }
        }
        this.inputManager.init();
    }

    destroy() {
        this.inputManager.destroy();
    }

    closeModal() {
        this.paneCleanup();
    }

    openModal(container: HTMLElement) {
        this.paneCleanup();
        container.innerHTML = '';

        const form = document.createElement('form');
        form.classList.add('config-form');

        const title = document.createElement('h2');
        title.textContent = 'Hotkeys UI';
        title.style.marginBottom = '20px';
        form.appendChild(title);

        for (const ad of this.actions) {
            const state = this.keysConfig[ad.id];

            const actionContainer = document.createElement('li');
            const label = document.createElement('label');
            label.classList.add('action-name');
            label.textContent = ad.id;

            const keyLabel = document.createElement('label');
            keyLabel.classList.add('action-key');
            keyLabel.textContent = printButtonConfig(state);
            keyLabel.dataset.action = ad.id;

            actionContainer.appendChild(label);
            actionContainer.appendChild(keyLabel);
            form.appendChild(actionContainer);

            actionContainer.addEventListener('click', () => {
                this.stopRecording();
                this.startRecording(ad.id, actionContainer);
            });
        }

        const okButton = document.createElement('button');
        okButton.type = 'button';
        okButton.textContent = 'OK';

        okButton.addEventListener('click', () => {
            this.stopRecording();
            for (const ad of this.actions) {
                const state = this.keysConfig[ad.id];
                if (state) {
                    console.log(`${ad.id} : ${printButtonConfig(state)}`);
                }
            }
            this.reset();
        });

        form.appendChild(okButton);
        container.appendChild(form);

        const panelClose = Promise.withResolvers<void>();
        this.paneCleanup = panelClose.resolve;

        return panelClose.promise.then(() => {
            container.innerHTML = '';
            this.paneCleanup = NOOP;
        });
    }

    private startRecording(actionId: string, actionContainer: HTMLElement) {
        const keyLabel = actionContainer.querySelector('.action-key');
        if (!keyLabel) {
            return;
        }
        const originalValue = this.keysConfig[actionId];
        this.stopRecording = () => {
            if (!this.keysConfig[actionId]) {
                this.keysConfig[actionId] = originalValue;
            }
            hotkeys.unbind('*');
            this.inputManager.init();
            keyLabel.textContent = printButtonConfig(this.keysConfig[actionId]);
            actionContainer.style.border = '1px solid transparent';
            console.log(`Stopped recording for action: ${actionId}`);
            this.stopRecording = NOOP;
        };
        this.inputManager.destroy();
        actionContainer.style.border = '1px solid #007BFF';
        this.keysConfig[actionId] = '';
        let lastKeyStr = '';
        keyLabel.textContent = ' ';
        hotkeys('*', { keyup: true }, (e) => {
            const keysStr = hotkeys
                .getPressedKeyString()
                .map((keyString) => {
                    switch (keyString) {
                        case '⌫':
                            return 'backspace';
                        case '↩':
                            return 'enter';
                        case '⇪':
                            return 'capslock';
                        case '⇧':
                            return 'shift';
                        case '⌥':
                            return 'alt';
                        case '⌃':
                            return 'ctrl';
                        case '⌘':
                            return 'cmd';
                        default:
                            return keyString;
                    }
                })
                .join('+');
            if (e.type === 'keyup' && lastKeyStr) {
                console.log('setting', actionId, lastKeyStr);
                this.keysConfig[actionId] = lastKeyStr;
                keyLabel.textContent = printButtonConfig(lastKeyStr);
                this.stopRecording();
            } else {
                lastKeyStr = keysStr;
                keyLabel.textContent = lastKeyStr || ' ';
            }
        });
        console.log(`Started recording for action: ${actionId}`);
    }
}
