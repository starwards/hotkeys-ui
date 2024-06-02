/* eslint-disable @typescript-eslint/no-namespace */

import mmkM from '@maulingmonkey/gamepad/modular';
declare global {
    interface GlobalEventHandlersEventMap extends mmkM.GamepadEventsMap_and_CustomEvent {}
}

if (!mmkM.isSupported()) console.warn('Gamepads not available in this browser');

export default mmkM;
