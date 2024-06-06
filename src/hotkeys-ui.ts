import { GamepadAxisConfig, GamepadButtonConfig, RangeConfig, isButtonConfig } from './input-config';
import { InputManager, RangeAction } from './input-manager';

import { RTuple2 } from './starwards-shim';
import hotkeys from 'hotkeys-js';
import mmkgp from './maulingmonkey-gamepad';

export type ClickConfig = string | GamepadButtonConfig;
export type ClicksState = Record<string, ClickConfig | undefined>;
export type AxesState = Record<string, GamepadAxisConfig | undefined>;
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

function printAxisConfig(c: GamepadAxisConfig | undefined) {
    if (!c) return ' ';
    const gamepads = mmkgp.getRawGamepads().filter((g): g is mmkgp.Gamepad => !!g);
    const gamepad = gamepads[c.gamepadIndex];
    return `axis ${c.axisIndex} on ${gamepad.displayId || gamepad.id}`;
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
    private clicksState: ClicksState = {};
    private axesState: AxesState = {};
    private paneCleanup = NOOP;
    private stopRecording = NOOP;

    constructor(private actions: ActionDefinition[]) {
        this.reset();
    }

    reset() {
        this.stopRecording();
        this.paneCleanup();
        this.inputManager.destroy(true);
        for (const ad of this.actions) {
            if (ad.type === 'click') {
                const state = this.clicksState[ad.id];
                if (isButtonConfig(state)) {
                    this.inputManager.addClickAction(ad.handler, state);
                }
            } else if (ad.type === 'momentary') {
                const state = this.clicksState[ad.id];
                if (isButtonConfig(state)) {
                    this.inputManager.addMomentaryClickAction(ad.handler, state);
                }
            } else if (ad.type === 'steps') {
                const up = this.clicksState[ad.id + '.up'];
                const down = this.clicksState[ad.id + '.down'];
                if (isButtonConfig(up) && isButtonConfig(down)) {
                    this.inputManager.addStepsAction(ad.handler, { step: ad.step, up, down });
                }
            } else if (ad.type === 'range') {
                const property: RangeAction = {
                    range: ad.range,
                    currentValue: ad.currentValue,
                    setValue: ad.handler,
                };
                const axis = this.axesState[ad.id];
                const config: RangeConfig = { axis };
                const center = this.clicksState[ad.id + '.center'];
                const up = this.clicksState[ad.id + '.up'];
                const down = this.clicksState[ad.id + '.down'];
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
            const state = this.clicksState[id];

            const actionContainer = document.createElement('li');
            const label = document.createElement('label');
            label.classList.add('action-name');
            label.textContent = name;

            const keyLabel = document.createElement('label');
            keyLabel.classList.add('action-key');
            keyLabel.textContent = printButtonConfig(state);
            actionContainer.appendChild(label);
            actionContainer.appendChild(keyLabel);
            form.appendChild(actionContainer);

            actionContainer.addEventListener('click', () => {
                this.startClickRecording(id, actionContainer);
            });
        };
        const addAxisEntry = (id: string, name: string) => {
            const state = this.axesState[id];

            const actionContainer = document.createElement('li');
            const label = document.createElement('label');
            label.classList.add('action-name');
            label.textContent = name;

            const keyLabel = document.createElement('label');
            keyLabel.classList.add('action-key');
            keyLabel.textContent = printAxisConfig(state);
            actionContainer.appendChild(label);
            actionContainer.appendChild(keyLabel);
            form.appendChild(actionContainer);

            actionContainer.addEventListener('click', () => {
                this.startAxisRecording(id, actionContainer);
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
                addAxisEntry(id, id);
            } else {
                addKeyEntry(id, id);
            }
        }

        const okButton = document.createElement('button');
        okButton.type = 'button';
        okButton.textContent = 'OK';

        okButton.addEventListener('click', () => {
            for (const ad of this.actions) {
                const state = this.clicksState[ad.id];
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

    private startAxisRecording(actionId: string, actionContainer: HTMLElement) {
        const axisLabel = actionContainer.querySelector('.action-key');
        if (!axisLabel) {
            return;
        }
        this.stopRecording();
        const originalValue = this.clicksState[actionId];
        const lastAxisEvents: GamepadAxisConfig[] = new Array<GamepadAxisConfig>(7).fill({
            gamepadIndex: -1,
            axisIndex: -1,
        });
        const onAxis = ({ gamepadIndex, axisIndex }: mmkgp.GamepadAxisEvent): void => {
            const curr = { gamepadIndex, axisIndex };
            // make sure the correct axis is recorded. wait for several events of same axis
            if (lastAxisEvents.every((e) => e.gamepadIndex === curr.gamepadIndex && e.axisIndex === curr.axisIndex)) {
                this.axesState[actionId] = curr;
                axisLabel.textContent = printAxisConfig(curr);
                this.stopRecording();
            } else {
                lastAxisEvents.shift();
                lastAxisEvents.push(curr);
            }
        };
        this.stopRecording = () => {
            if (!this.clicksState[actionId]) {
                this.clicksState[actionId] = originalValue;
            }
            removeEventListener('mmk-gamepad-axis-value', onAxis);
            this.inputManager.init();
            axisLabel.textContent = printAxisConfig(this.axesState[actionId]);
            actionContainer.style.border = '1px solid transparent';
            console.log(`Stopped recording for action: ${actionId}`);
            this.stopRecording = NOOP;
        };
        this.inputManager.destroy();
        actionContainer.style.border = '1px solid #007BFF';
        this.clicksState[actionId] = '';
        axisLabel.textContent = ' ';

        addEventListener('mmk-gamepad-axis-value', onAxis);
        console.log(`Started recording for action: ${actionId}`);
    }

    private startClickRecording(actionId: string, actionContainer: HTMLElement) {
        const keyLabel = actionContainer.querySelector('.action-key');
        if (!keyLabel) {
            return;
        }
        this.stopRecording();
        const originalValue = this.clicksState[actionId];
        const onButton = ({ gamepadIndex, buttonIndex }: mmkgp.GamepadButtonEvent): void => {
            const buttonConfig = { gamepadIndex, buttonIndex };
            this.clicksState[actionId] = buttonConfig;
            keyLabel.textContent = printButtonConfig(buttonConfig);
            this.stopRecording();
        };
        this.stopRecording = () => {
            if (!this.clicksState[actionId]) {
                this.clicksState[actionId] = originalValue;
            }
            hotkeys.unbind('*');
            removeEventListener('mmk-gamepad-button-value', onButton);
            this.inputManager.init();
            keyLabel.textContent = printButtonConfig(this.clicksState[actionId]);
            actionContainer.style.border = '1px solid transparent';
            console.log(`Stopped recording for action: ${actionId}`);
            this.stopRecording = NOOP;
        };
        this.inputManager.destroy();
        actionContainer.style.border = '1px solid #007BFF';
        this.clicksState[actionId] = '';
        let lastKeyStr = '';
        keyLabel.textContent = ' ';
        hotkeys('*', { keyup: true }, (e) => {
            const keysStr = hotkeys
                .getPressedKeyString()
                .map((keyString) => TRANSLATE_KEY_STRING[keyString] || keyString)
                .join('+');
            if (e.type === 'keyup' && lastKeyStr) {
                console.log('setting', actionId, lastKeyStr);
                this.clicksState[actionId] = lastKeyStr;
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
