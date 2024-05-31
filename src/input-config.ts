export class GamepadAxisConfig {
    constructor(
        public gamepadIndex: number,
        public axisIndex: number,
        public deadzone?: [number, number],
        public inverted?: boolean,
        public velocity?: number,
    ) {}
}
export class GamepadButtonConfig {
    constructor(
        public gamepadIndex: number,
        public buttonIndex: number,
    ) {}
}
export function isButtonConfig(
    v: string | GamepadButtonConfig | RangeConfig | undefined,
): v is string | GamepadButtonConfig {
    return (
        typeof v === 'string' ||
        !!(v && (v as GamepadButtonConfig).gamepadIndex && (v as GamepadButtonConfig).buttonIndex)
    );
}
export class KeysStepsConfig {
    constructor(
        public up: string | GamepadButtonConfig,
        public down: string | GamepadButtonConfig,
        public step: number,
    ) {}
}
class GamepadButtonsCenterConfig {
    constructor(public center: GamepadButtonConfig) {}
}
class GamepadButtonsRangeConfig {
    constructor(
        public up: GamepadButtonConfig,
        public down: GamepadButtonConfig,
        public center: GamepadButtonConfig,
        public step: number,
    ) {}
}

export function isGamepadButtonsRangeConfig(
    v: GamepadButtonsRangeConfig | GamepadButtonsCenterConfig,
): v is GamepadButtonsRangeConfig {
    return v instanceof GamepadButtonsRangeConfig || !!(v as GamepadButtonsRangeConfig).step;
}
export class KeysRangeConfig {
    constructor(
        public up: string,
        public down: string,
        public center: string,
        public step: number,
    ) {}
}

export interface RangeConfig {
    axis?: GamepadAxisConfig;
    buttons?: GamepadButtonsRangeConfig | GamepadButtonsCenterConfig;
    offsetKeys?: KeysRangeConfig;
}
