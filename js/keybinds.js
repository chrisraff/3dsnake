/**
 * @author Chris Raff / http://www.ChrisRaff.com/
 */

import { storageGetItem } from "./storage.js";

const nullAction = function() {};

let defaultKeybindings = {
    'actionUp': {
        'desc': 'Up',
        'binds': [
            {
                'type': 'keydown',
                'key': 'w'
            }
        ],
        'action': nullAction
    },
    'actionDown': {
        'desc': 'Down',
        'binds': [
            {
                'type': 'keydown',
                'key': 's'
            }
        ],
        'action': nullAction
    },
    'actionLeft': {
        'desc': 'Left',
        'binds': [
            {
                'type': 'keydown',
                'key': 'a'
            }
        ],
        'action': nullAction
    },
    'actionRight': {
        'desc': 'Right',
        'binds': [
            {
                'type': 'keydown',
                'key': 'd'
            }
        ],
        'action': nullAction
    },
    'actionIn': {
        'desc': 'In',
        'binds': [
            {
                'type': 'mousedown',
                'button': 0
            }
        ],
        'action': nullAction
    },
    'actionOut': {
        'desc': 'Out',
        'binds': [
            {
                'type': 'mousedown',
                'button': 2
            }
        ],
        'action': nullAction
    },
    'actionRotateLeft': {
        'desc': 'Rotate Left',
        'binds': [
            {
                'type': 'keydown',
                'key': 'q'
            }
        ],
        'action': nullAction
    },
    'actionRotateRight': {
        'desc': 'Rotate Right',
        'binds': [
            {
                'type': 'keydown',
                'key': 'e'
            }
        ],
        'action': nullAction
    }
}

let keyBindings = JSON.parse(JSON.stringify(defaultKeybindings));

let keydownBinds = {};
let mousedownBinds = {};

function setupKeyBindings(keyBindings) {
    keydownBinds = {};
    mousedownBinds = {};

    for (let action in keyBindings) {
        let binds = keyBindings[action].binds;
        for (let i = 0; i < binds.length; i++) {
            let bind = binds[i];
            if (bind.type === 'keydown') {
                if (!keydownBinds[bind.key]) {
                    keydownBinds[bind.key] = [];
                }
                keydownBinds[bind.key].push(action);
            } else if (bind.type === 'mousedown') {
                if (!mousedownBinds[bind.button]) {
                    mousedownBinds[bind.button] = [];
                }
                mousedownBinds[bind.button].push(action);
            }
        }
    }
}

function deleteBinding(action, type, key, button) {
    let binds = keyBindings[action].binds;
    for (let i = 0; i < binds.length; i++) {
        let bind = binds[i];
        if (bind.type === type) {
            if (type === 'keydown' && bind.key === key) {
                binds.splice(i, 1);
                break;
            } else if (type === 'mousedown' && bind.button === button) {
                binds.splice(i, 1);
                break;
            }
        }
    }
}

function loadKeybinds() {
    let keybinds = JSON.parse(storageGetItem('keybinds', null));
    if (keybinds) {
        keyBindings = keybinds;

        for (let action in keyBindings) {
            keyBindings[action].action = nullAction;
        }
    }
}

function stringifyKeybinds() {
    // callbacks are ignored
    return JSON.stringify(keyBindings);
}

export { keyBindings, defaultKeybindings, keydownBinds, mousedownBinds, setupKeyBindings, deleteBinding, loadKeybinds, stringifyKeybinds };
