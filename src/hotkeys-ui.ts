import { GamepadButtonConfig, RangeConfig, isButtonConfig } from './input-config';
import { InputManager, RangeAction } from './input-manager';

import { RTuple2 } from './starwards-shim';
import hotkeys from 'hotkeys-js';
import mmkgp from './maulingmonkey-gamepad';

export type ClickConfig = string | GamepadButtonConfig;
export type ConfigState = Record<string, ClickConfig | undefined>;
export type ClickActionDefinition = {
    id: string;
    type: 'click';
    handler: () => unknown;
};
export type MomentaryClickActionDefinition = {
    id: string;
    type: 'momentary';
    handler: (v: boolean) => unknown;
};
export type StepsActionDefinition = {
    id: string;
    type: 'steps';
    step: number;
    handler: (v: number) => unknown;
};
export type RangeActionDefinition = {
    id: string;
    type: 'range';
    range: RTuple2;
    step: number;
    currentValue?: number;
    handler: (v: number) => unknown;
};

export type ActionDefinition =
    | RangeActionDefinition
    | ClickActionDefinition
    | MomentaryClickActionDefinition
    | StepsActionDefinition;
function printButtonConfig(c: ClickConfig | undefined) {
    if (!isButtonConfig(c)) return ' ';
    if (typeof c === 'string') return c || ' ';
    const gamepads = mmkgp.getRawGamepads().filter((g): g is mmkgp.Gamepad => !!g);
    const gamepad = gamepads[c.gamepadIndex];
    return `button ${c.buttonIndex} on ${gamepad.displayId || gamepad.id}`;
}

const NOOP = () => undefined as unknown;

const TRANSLATE_KEY_STRING = {
    '⌫': 'backspace',
    '↩': 'enter',
    '⇪': 'capslock',
    '⇧': 'shift',
    '⌥': 'alt',
    '⌃': 'ctrl',
    '⌘': 'cmd',
} as Record<string, string | undefined>;
export class HotkeysUi {
    private inputManager = new InputManager();
    private clickConfig: ConfigState = {};
    private paneCleanup = NOOP;
    private stopRecording = NOOP;

    constructor(private actions: ActionDefinition[]) {
        this.reset();
    }

    reset() {
        this.paneCleanup();
        this.inputManager.destroy();
        for (const ad of this.actions) {
            if (ad.type === 'click') {
                const state = this.clickConfig[ad.id];
                if (isButtonConfig(state)) {
                    this.inputManager.addClickAction(ad.handler, state);
                }
            } else if (ad.type === 'momentary') {
                const state = this.clickConfig[ad.id];
                if (isButtonConfig(state)) {
                    this.inputManager.addMomentaryClickAction(ad.handler, state);
                }
            } else if (ad.type === 'steps') {
                const up = this.clickConfig[ad.id + '.up'];
                const down = this.clickConfig[ad.id + '.down'];
                if (isButtonConfig(up) && isButtonConfig(down)) {
                    this.inputManager.addStepsAction(ad.handler, { step: ad.step, up, down });
                }
            } else if (ad.type === 'range') {
                const property: RangeAction = {
                    range: ad.range,
                    currentValue: ad.currentValue,
                    setValue: ad.handler,
                };
                const config: RangeConfig = {};
                const center = this.clickConfig[ad.id + '.center'];
                const up = this.clickConfig[ad.id + '.up'];
                const down = this.clickConfig[ad.id + '.down'];
                const step = ad.step;
                config.clicks = {
                    up,
                    down,
                    center,
                    step,
                };
                this.inputManager.addRangeAction(property, config);
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

    async openModal(container: HTMLElement) {
        this.paneCleanup();
        container.innerHTML = '';

        const form = document.createElement('form');
        form.classList.add('config-form');

        const title = document.createElement('h2');
        title.textContent = 'Hotkeys UI';
        title.style.marginBottom = '20px';
        form.appendChild(title);
        const addKeyEntry = (id: string, name: string) => {
            const state = this.clickConfig[id];

            const actionContainer = document.createElement('li');
            const label = document.createElement('label');
            label.classList.add('action-name');
            label.textContent = name;

            const keyLabel = document.createElement('label');
            keyLabel.classList.add('action-key');
            keyLabel.textContent = printButtonConfig(state);
            // keyLabel.dataset.action = id;
            actionContainer.appendChild(label);
            actionContainer.appendChild(keyLabel);
            form.appendChild(actionContainer);

            actionContainer.addEventListener('click', () => {
                this.stopRecording();
                this.startRecording(id, actionContainer);
            });
        };

        for (const ad of this.actions) {
            const { id, type } = ad;
            if (type === 'steps') {
                addKeyEntry(id + '.up', id + ' (Up)');
                addKeyEntry(id + '.down', id + ' (Down)');
            } else if (ad.type === 'range') {
                addKeyEntry(id + '.up', id + ' (Up)');
                addKeyEntry(id + '.down', id + ' (Down)');
                addKeyEntry(id + '.center', id + ' (Center)');
            } else {
                addKeyEntry(id, id);
            }
        }

        const okButton = document.createElement('button');
        okButton.type = 'button';
        okButton.textContent = 'OK';

        okButton.addEventListener('click', () => {
            this.stopRecording();
            for (const ad of this.actions) {
                const state = this.clickConfig[ad.id];
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

        await panelClose.promise;
        container.innerHTML = '';
        this.paneCleanup = NOOP;
    }

    private startRecording(actionId: string, actionContainer: HTMLElement) {
        const keyLabel = actionContainer.querySelector('.action-key');
        if (!keyLabel) {
            return;
        }
        const originalValue = this.clickConfig[actionId];
        const onButton = ({ gamepadIndex, buttonIndex }: mmkgp.GamepadButtonEvent): void => {
            const buttonConfig = { gamepadIndex, buttonIndex };
            this.clickConfig[actionId] = buttonConfig;
            keyLabel.textContent = printButtonConfig(buttonConfig);
            this.stopRecording();
        };
        this.stopRecording = () => {
            if (!this.clickConfig[actionId]) {
                this.clickConfig[actionId] = originalValue;
            }
            hotkeys.unbind('*');
            removeEventListener('mmk-gamepad-button-value', onButton);
            this.inputManager.init();
            keyLabel.textContent = printButtonConfig(this.clickConfig[actionId]);
            actionContainer.style.border = '1px solid transparent';
            console.log(`Stopped recording for action: ${actionId}`);
            this.stopRecording = NOOP;
        };
        this.inputManager.destroy();
        actionContainer.style.border = '1px solid #007BFF';
        this.clickConfig[actionId] = '';
        let lastKeyStr = '';
        keyLabel.textContent = ' ';
        hotkeys('*', { keyup: true }, (e) => {
            const keysStr = hotkeys
                .getPressedKeyString()
                .map((keyString) => TRANSLATE_KEY_STRING[keyString] || keyString)
                .join('+');
            if (e.type === 'keyup' && lastKeyStr) {
                console.log('setting', actionId, lastKeyStr);
                this.clickConfig[actionId] = lastKeyStr;
                keyLabel.textContent = printButtonConfig(lastKeyStr);
                this.stopRecording();
            } else {
                lastKeyStr = keysStr;
                keyLabel.textContent = lastKeyStr || ' ';
            }
        });
        addEventListener('mmk-gamepad-button-value', onButton);
        console.log(`Started recording for action: ${actionId}`);
    }
}
