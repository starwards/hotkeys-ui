export type RTuple2 = readonly [number, number];

export function capToRange(from: number, to: number, value: number) {
    return value > to ? to : value < from ? from : value;
}

export function isInRange(from: number, to: number, value: number) {
    return value < to && value > from;
}
