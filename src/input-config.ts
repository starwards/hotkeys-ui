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
        !!(
            v &&
            typeof (v as GamepadButtonConfig).gamepadIndex === 'number' &&
            typeof (v as GamepadButtonConfig).buttonIndex === 'number'
        )
    );
}
export class StepsConfig {
    constructor(
        public up: string | GamepadButtonConfig,
        public down: string | GamepadButtonConfig,
        public step: number,
    ) {}
}
// class GamepadButtonsCenterConfig {
//     constructor(public center: GamepadButtonConfig | string | undefined) {}
// }
// class GamepadButtonsRangeConfig {
//     constructor(
//         public up: GamepadButtonConfig | string | undefined,
//         public down: GamepadButtonConfig | string | undefined,
//         public center: GamepadButtonConfig | string | undefined,
//         public step: number,
//     ) {}
// }

// export function isGamepadButtonsRangeConfig(
//     v: GamepadButtonsRangeConfig | GamepadButtonsCenterConfig,
// ): v is GamepadButtonsRangeConfig {
//     return v instanceof GamepadButtonsRangeConfig || !!(v as GamepadButtonsRangeConfig).step;
// }
export class ClickRangeConfig {
    constructor(
        public up: GamepadButtonConfig | string | undefined,
        public down: GamepadButtonConfig | string | undefined,
        public center: GamepadButtonConfig | string | undefined,
        public step: number,
    ) {}
}

export interface RangeConfig {
    axis?: GamepadAxisConfig;
    clicks?: ClickRangeConfig;
}
