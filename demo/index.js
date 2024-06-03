import { HotkeysUi } from '/src/index.ts';
const logContainer = document.getElementById('logContainer');
const logEntries = [];
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
];
const hui = new HotkeysUi(actions);
document.getElementById('niceButton').addEventListener('click', () => {
    modal.style.display = 'flex';
    const container = document.getElementById('keybindings-container');
    hui.openModal(container).then(() => {
        modal.style.display = 'none';
    });
});

document.querySelector('.close').addEventListener('click', () => {
    hui.closeModal();
});

window.addEventListener('click', (event) => {
    if (event.target == modal) {
        hui.closeModal();
    }
});
