// import '@maulingmonkey/gamepad';

import { GamepadAxisConfig, GamepadButtonConfig, RangeConfig, StepsConfig } from './input-config';
import { RTuple2, capToRange, isInRange, midRange } from './starwards-shim';

import { EmitterLoop } from './loop';
import hotkeys from 'hotkeys-js';
import mmkgp from './maulingmonkey-gamepad';

type AxisListener = { axis: GamepadAxisConfig; range: RTuple2; setValue: (v: number) => unknown };
type ButtonListener = { button: GamepadButtonConfig; setValue?: (v: boolean) => unknown; onClick?: () => unknown };
type KeyListener = { key: string; setValue?: (v: boolean) => unknown; onClick?: () => unknown };

function lerpAxisToRange(range: RTuple2, axisValue: number) {
    const t = (axisValue + 1) / 2;
    return (1 - t) * range[0] + t * range[1];
}
export interface RangeAction {
    range: RTuple2;
    currentValue?: number | undefined;
    setValue: (v: number) => unknown;
}
interface TriggerAction {
    setValue: (v: boolean) => unknown;
}
interface ToggleAction {
    getValue: () => boolean | undefined;
    setValue: (v: boolean) => unknown;
}
export function numberAction(action: { setValue: (v: number) => unknown }): TriggerAction {
    return { setValue: (v: boolean) => action.setValue(Number(v)) };
}
export class InputManager {
    private axes: AxisListener[] = [];
    private buttons: ButtonListener[] = [];
    private keys: KeyListener[] = [];
    private loop = new EmitterLoop(1000 / 10);
    private readonly onButton = (e: mmkgp.GamepadButtonEvent & CustomEvent<undefined>): void => {
        for (const listener of this.buttons) {
            if (e.buttonIndex === listener.button.buttonIndex && e.gamepadIndex === listener.button.gamepadIndex) {
                const value = Boolean(e.buttonValue);
                if (listener.setValue) {
                    listener.setValue(value);
                }
                if (value && listener.onClick) {
                    listener.onClick();
                }
            }
        }
    };
    private readonly onAxis = (e: mmkgp.GamepadAxisEvent & CustomEvent<undefined>): void => {
        for (const listener of this.axes) {
            if (e.axisIndex === listener.axis.axisIndex && e.gamepadIndex === listener.axis.gamepadIndex) {
                let value = e.axisValue;
                if (listener.axis.inverted) {
                    value = -value;
                }
                if (listener.axis.deadzone && isInRange(listener.axis.deadzone[0], listener.axis.deadzone[1], value)) {
                    value = 0;
                }
                value = lerpAxisToRange(listener.range, value);
                listener.setValue(value);
            }
        }
    };

    init() {
        if (!this.loop.isStarted()) {
            addEventListener('mmk-gamepad-button-value', this.onButton);
            addEventListener('mmk-gamepad-axis-value', this.onAxis);
            for (const key of this.keys) {
                let lastEvent = '';
                hotkeys(key.key, { keyup: true }, ({ type }) => {
                    if (lastEvent === type) return;
                    lastEvent = type;
                    const value = type === 'keydown';
                    if (value && key.onClick) {
                        key.onClick();
                    }
                    if (key.setValue) {
                        key.setValue(value);
                    }
                });
            }
            this.loop.start();
        }
    }

    destroy(clear = false) {
        if (this.loop.isStarted()) {
            this.loop.stop();
            removeEventListener('mmk-gamepad-axis-value', this.onAxis);
            removeEventListener('mmk-gamepad-button-value', this.onButton);
            for (const key of this.keys) {
                hotkeys.unbind(key.key);
            }
        }
        if (clear) {
            this.loop.clear();
            this.axes = [];
            this.buttons = [];
            this.keys = [];
        }
    }

    addRangeAction(property: RangeAction, range: RangeConfig | undefined) {
        if (range) {
            const { axis, clicks } = range;
            if (clicks || axis?.velocity) {
                const callbacks = new CombinedRangeCallbacks(property, !axis);
                if (clicks) {
                    this.addClickAction(callbacks.centerOffset, clicks.center);
                    this.addClickAction(callbacks.upOffset(clicks.step), clicks.up);
                    this.addClickAction(callbacks.downOffset(clicks.step), clicks.down);
                }
                if (axis) {
                    if (axis.velocity) {
                        this.axes.push({
                            axis,
                            range: property.range,
                            setValue: callbacks.offsetVelocity(this.loop),
                        });
                    } else {
                        this.axes.push({ axis, range: property.range, setValue: callbacks.axis });
                    }
                }
            } else if (axis) {
                this.axes.push({ axis, ...property });
            }
        }
    }

    addMomentaryClickAction(setValue: (v: boolean) => unknown, config: GamepadButtonConfig | string | undefined) {
        if (typeof config === 'object') {
            this.buttons.push({ button: config, setValue });
        } else if (typeof config === 'string') {
            this.keys.push({ key: config, setValue });
        }
    }

    addToggleClickAction(property: ToggleAction, config: GamepadButtonConfig | string | undefined) {
        const onClick = () => property.setValue(!property.getValue());
        this.addClickAction(onClick, config);
    }

    addClickAction(onClick: () => unknown, config: GamepadButtonConfig | string | undefined) {
        if (typeof config === 'object') {
            this.buttons.push({ button: config, onClick });
        } else if (typeof config === 'string') {
            this.keys.push({ key: config, onClick });
        }
    }

    addStepsAction(setValue: (v: number) => unknown, config: StepsConfig | undefined) {
        if (config) {
            this.addClickAction(() => void setValue(config.step), config.up);
            this.addClickAction(() => void setValue(-config.step), config.down);
        }
    }
}
type CallbackProperty = Pick<RangeAction, 'currentValue' | 'setValue' | 'range'>;
class CombinedRangeCallbacks {
    private readonly midRange: number;
    private axisValue = 0;
    private offsetValue: number;

    constructor(
        private property: CallbackProperty,
        noAxis: boolean,
    ) {
        this.midRange = lerpAxisToRange(this.property.range, 0);
        this.offsetValue = 0;
        if (noAxis) {
            this.offsetValue = property.currentValue ?? midRange(...this.property.range);
        }
    }
    private onChange() {
        this.property.setValue(this.axisValue + this.offsetValue);
    }
    centerOffset = () => {
        this.offsetValue = this.midRange;
        this.onChange();
    };
    upOffset(stepSize: number) {
        return () => {
            this.offsetValue = capToRange(this.property.range[0], this.property.range[1], this.offsetValue + stepSize);
            this.onChange();
        };
    }
    downOffset(stepSize: number) {
        return () => {
            this.offsetValue = capToRange(this.property.range[0], this.property.range[1], this.offsetValue - stepSize);
            this.onChange();
        };
    }
    axis = (v: number) => {
        this.axisValue = v;
        this.onChange();
    };

    offsetVelocity(loop: EmitterLoop) {
        let velocity = 0;
        loop.onLoop((deltaSeconds) => {
            if (velocity != 0) {
                this.offsetValue = capToRange(
                    this.property.range[0],
                    this.property.range[1],
                    this.offsetValue + velocity * deltaSeconds,
                );
                this.onChange();
            }
        });
        return (v: number) => {
            velocity = v;
        };
    }
}
