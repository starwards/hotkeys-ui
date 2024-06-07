import { ActionDefinition, HotkeysUi } from '../src/index.ts';
import { InputEventMap, WebMidi } from 'webmidi';

import { Input, WebMidi } from 'webmidi';

// Enable WEBMIDI.js and trigger the onEnabled() function when ready
WebMidi.enable()
    .then(onEnabled)
    .catch((err) => alert(err));

// Function triggered when WEBMIDI.js is ready
function onEnabled() {
    // Display available MIDI input devices
    if (WebMidi.inputs.length < 1) {
        console.log('No MIDI device detected.');
    } else {
        for (const [index, device] of WebMidi.inputs.entries()) {
            console.log(`Detected MIDI device ${index}: ${device.name}`);

            // Listen for all MIDI events
            const eventTypes: Array<keyof InputEventMap> = [
                'noteon',
                'noteoff',
                'controlchange',
                // 'pitchbend',
                'programchange',
                // 'channelaftertouch',
                'unknownmessage',
                'midimessage',
            ];

            for (const eventType of eventTypes) {
                device.addListener(eventType, (e) => {
                    console.log(`Event: ${eventType} Device: ${device.name} Channel: ${e.channel} Data: `, e.data);
                    if (eventType === 'noteon' || eventType === 'noteoff') {
                        console.log(`Note: ${e.note.name}${e.note.octave} Velocity: ${e.rawVelocity}`);
                    } else if (eventType === 'controlchange') {
                        console.log(`Controller: ${e.controller.number} Value: ${e.value}`);
                    } else if (eventType === 'pitchbend') {
                        console.log(`Value: ${e.value}`);
                    } else if (eventType === 'programchange') {
                        console.log(`Program: ${e.value}`);
                    } else if (eventType === 'channelaftertouch') {
                        console.log(`Pressure: ${e.value}`);
                    }
                });
            }
        }
    }
}

const logContainer = document.getElementById('logContainer')!;
const logEntries = ['start of action log'];
const modal = document.createElement('div');
modal.id = 'modal';
modal.className = 'modal';
modal.innerHTML = `
    <div class="modal-content">
        <span class="close">&times;</span>
        <div id="keybindings-container" class="form-container"></div>
    </div>
`;
document.body.appendChild(modal);
function addLogEntry(message) {
    const timestamp = new Date().toLocaleTimeString();
    logEntries.push(`${timestamp} - ${message}`);
    if (logEntries.length > 20) {
        logEntries.shift();
    }
    logContainer.innerHTML = logEntries.map((entry) => `<div class="log-entry">${entry}</div>`).join('');
    logContainer.scrollTop = logContainer.scrollHeight;
}
const actions = [
    {
        id: 'Action 1',
        type: 'click',
        handler: () => {
            addLogEntry(`Action 1 (click)`);
        },
    },
    {
        id: 'Action 2',
        type: 'momentary',
        handler: (v) => {
            addLogEntry(`Action 2 (momentary): ${v ? 'on' : 'off'}`);
        },
    },
    {
        id: 'Action 3',
        type: 'steps',
        step: 1,
        handler: (v) => {
            addLogEntry(`Action 3 (steps): ${v}`);
        },
    },
    {
        id: 'Action 4',
        type: 'range',
        range: [-100, 100],
        handler: (v) => {
            addLogEntry(`Action 4 (range): ${v}`);
        },
        step: 5,
    },
] satisfies ActionDefinition[];
const hui = new HotkeysUi(actions);
document.getElementById('niceButton')!.addEventListener('click', () => {
    modal.style.display = 'flex';
    const container = document.getElementById('keybindings-container')!;
    hui.openModal(container).then(() => {
        modal.style.display = 'none';
    });
});

document.querySelector('.close')!.addEventListener('click', () => {
    hui.closeModal();
});

window.addEventListener('click', (event) => {
    if (event.target == modal) {
        hui.closeModal();
    }
});
