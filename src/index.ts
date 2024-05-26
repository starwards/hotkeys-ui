import { Pane } from 'tweakpane';

export { InputManager } from './input-manager';

export function openModal(container: HTMLElement) {
    const pane = new Pane({ container, title: 'Hotkeys UI' });
    pane.addBinding({ name: 'example', value: 10 }, 'value', { min: 0, max: 100 });
    return pane;
}
