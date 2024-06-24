/**
 * @author Chris Raff / http://www.ChrisRaff.com/
 */
import * as THREE from 'three';
import { SnakeGame } from './snake.js';
import * as keybinds from './keybinds.js';
import { storageSetItem } from './storage.js';

// webpage objects

var renderer;

// basic objects
var fpsClock;

var scene;
var camera;

var tmpColor;

var tmpVector = new THREE.Vector3();
const VECX  = new THREE.Vector3(1, 0, 0);
const VECY  = new THREE.Vector3(0, 1, 0);
const VECZ  = new THREE.Vector3(0, 0, 1);
const VECXN = new THREE.Vector3(-1,0, 0);
const VECYN = new THREE.Vector3(0,-1, 0);
const VECZN = new THREE.Vector3(0, 0,-1);

const XZVECS = [VECX, VECZ, VECXN, VECZN];

const PI_2 = Math.PI / 2;

// models
var cube_geometry;
var bounds_geometry;

// game state
var game;
var moveLoopTimeoutId;
var tickInterval = 350;
var playing = false;
var backgroundTimeStamp = 0;
var orientationRadian = 0;
var orientationTarget = 0;

var isRecordingBinding = false;

var cubeMaterial;
var foodMaterial;
var boundsMaterial;

var boundsMesh;

var rotateNode;

// colors
const damageColor = new THREE.Color(0.1, 0.0, 0.0);
const blackColor = new THREE.Color(0.0, 0.0, 0.0);

function init() {

    renderer = new THREE.WebGLRenderer( { antialias: true, powerPreference: "high-performance" } );
    renderer.setPixelRatio( Math.min(window.devicePixelRatio, 2) );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.domElement.id = "mainCanvas";
    document.body.appendChild( renderer.domElement );

    // setup basic objects
    fpsClock = new THREE.Clock();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

    rotateNode = new THREE.Object3D();
    scene.add(rotateNode);

    // load grid texture
    const loader = new THREE.TextureLoader();
    const gridTexture = loader.load('textures/grid_texture.png');
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(2, 2); // Adjust for desired tiling

    // set camera position
    camera.position.set(1, 1, 12);
    camera.lookAt(0, 0, 0);

    tmpColor = new THREE.Color();

    // materials;
    cubeMaterial = new THREE.MeshLambertMaterial( {color: '#cccccc' } );
    foodMaterial = new THREE.MeshLambertMaterial( {color: '#ff0000' } );

    const vertexShader = document.querySelector('#vertexShader').textContent;
    const fragmentShader = document.querySelector('#fragmentShader').textContent;
    boundsMaterial = new THREE.ShaderMaterial({
        uniforms: {
            playerPosition: {  value: camera.position },
            gridTexture: {value: gridTexture }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });

    // set up lights
    let localLight = new THREE.PointLight( 0xffffff, 100 );
    camera.add( localLight );
    rotateNode.add( camera );
    let ambLight = new THREE.AmbientLight( 0x808080 );
    scene.add( ambLight );

    // tmpVector = new THREE.Vector3();

    cube_geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    bounds_geometry = new THREE.BoxGeometry(1, 1, 1);

    boundsMesh = new THREE.Mesh(bounds_geometry, boundsMaterial);
    scene.add(boundsMesh);

    // set initial camera position
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    game = new SnakeGame();
    game.context = {
        'cubeGeometry': cube_geometry,
        'material': cubeMaterial,
        'foodMaterial': foodMaterial,
        'boundsMesh': boundsMesh,
        'scene': scene
    }

    // setup game event listeners
    game.addEventListener('gameOver', handleGameOver);
    game.addEventListener('invalidMove', handleInvalidMove);

    // setup window resize handlers
    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'orientationchange', onWindowResize, false );

    // detect if mobile / tablet
    setMobileControls(window.matchMedia('(hover: none)').matches);

    window.addEventListener( 'keydown', onKeyDown, false);

    keybinds.loadKeybinds();

    keybinds.keyBindings.actionUp.action = function() { move(0, 1, 0); };
    keybinds.keyBindings.actionDown.action = function() { move(0, -1, 0); };
    keybinds.keyBindings.actionLeft.action = function() { movePlanar(-PI_2); };
    keybinds.keyBindings.actionRight.action = function() { movePlanar(PI_2); };
    keybinds.keyBindings.actionIn.action = function() { movePlanar(Math.PI); };
    keybinds.keyBindings.actionOut.action = function() { movePlanar(0); };
    keybinds.keyBindings.actionRotateLeft.action = function() { if (playing) orientationTarget -= PI_2; };
    keybinds.keyBindings.actionRotateRight.action = function() { if (playing) orientationTarget += PI_2; };

    setupKeyBindings();

    // setup touch controls
    document.querySelectorAll('.touch-controls .button').forEach(button => {
        const action = button.getAttribute('target-action');
        const actionCallback = keybinds.keyBindings[action].action;

        button.addEventListener('touchstart', (event) => {
            event.preventDefault();
            actionCallback();
        });
    });

    // Add a contextmenu event listener to prevent the default menu from appearing
    document.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });

    document.addEventListener('mouseleave', function(event) {
        pauseGame();
    });

    //
    initGame();
}

function setMobileControls(isMobile)
{
    if (isMobile)
    {
        // remove event listeners
        document.removeEventListener('mousedown', onMouseDown, false);
        document.removeEventListener('mousemove', onMouseMove, false);

        // add touch controls
        document.body.classList.add('formfactor-touchfirst');
        // add camera draggability
        const canvas = document.querySelector('#mainCanvas');
        canvas.addEventListener('touchstart', onTouchStart, false);
        canvas.addEventListener('touchmove', onTouchMove, false);
    }
    else
    {
        // add event listeners
        document.addEventListener('mousedown', onMouseDown, false);
        document.addEventListener('mousemove', onMouseMove, false);

        // remove event listeners
        document.removeEventListener('touchstart', onTouchStart, false);
        document.removeEventListener('touchmove', onTouchMove, false);

        // remove touch controls
        document.body.classList.remove('formfactor-touchfirst');
    }

}

function pauseGame()
{
    if (!playing)
        return;

    setPlaying(false);
    setMenu('menu-pause');
}

function setPlaying(isPlaying)
{
    playing = isPlaying;
    if (playing)
    {
        setMenu(null);
        // unhide the mobile controls
        document.querySelectorAll('.touch-controls').forEach(touchControls => {
            touchControls.classList.remove('hide');
        });

        moveLoopTimeoutId = setTimeout(moveLoop, tickInterval);
    }
    else
    {
        clearTimeout(moveLoopTimeoutId);

        // hide the mobile controls
        document.querySelectorAll('.touch-controls').forEach(touchControls => {
            touchControls.classList.add('hide');
        });
    }
}

// set initial conditions for game
function initGame()
{
    game.init();

    const snakeLives = document.querySelectorAll('.snake-life');
    snakeLives.forEach(snakeLife => {
        snakeLife.innerText = '🟩';
    });

    for (let i = 0; i < game.nodes.length; i++)
    {
        scene.add(game.nodes[i]);
    }

    orientationRadian = 0;
    orientationTarget = 0;
}

function moveLoop()
{
    game.tick();

    boundsMaterial.uniforms.playerPosition.value = game.nodes[0].position;

    document.querySelector('#snake-realtime-length').innerHTML = game.nodes.length;

    moveLoopTimeoutId = setTimeout(moveLoop, tickInterval);
}

function setupKeyBindings()
{
    // map keybinds to onkeydown and onmousedown events
    keybinds.setupKeyBindings(keybinds.keyBindings);

    // add the keybinds to the controls menu
    const controlRows = document.querySelectorAll('.control-row');
    controlRows.forEach(controlRow => {
        const bindingArea = controlRow.querySelector('.binding-area');
        // delete all children of the binding area
        while (bindingArea.firstChild) {
            bindingArea.removeChild(bindingArea.firstChild);
        }

        // add a button for each keybind
        const action = controlRow.getAttribute('target-action');
        keybinds.keyBindings[action].binds.forEach(bind => {
            const button = document.createElement('button');

            setupBindingButton(button, bind);
            button.onclick = () => {
                handleDeleteBinding(button);
            };
            bindingArea.appendChild(button);
        });

        // setup callback for adding a new keybind
        const addButton = controlRow.querySelector('.button-add-binding');
        addButton.onclick = () => {
            if (isRecordingBinding)
                return;

            isRecordingBinding = true;

            // disable all buttons
            const addButtons = document.querySelectorAll('button');
            addButtons.forEach(addButton => {
                addButton.disabled = true;
                addButton.classList.add('binding-disabled');
            });

            // add a button to the binding area
            const button = document.createElement('button');
            button.classList.add('button-binding-recording');
            button.innerText = 'Waiting...';
            bindingArea.appendChild(button);
        };
    });
}

function handleDeleteBinding(button)
{
    // if we are recording a binding, don't delete the binding
    if (isRecordingBinding)
        return;

    const action = button.parentElement.parentElement.parentElement.getAttribute('target-action');
    const binding = JSON.parse(button.getAttribute('binding-data'));

    keybinds.deleteBinding(action, binding.type, binding.key, binding.button);
    button.parentElement.removeChild(button);

    keybinds.setupKeyBindings(keybinds.keyBindings);

    storageSetItem('keybinds', keybinds.stringifyKeybinds());
}

const keyDisplayMap = {
    ' ': 'Space',
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→'
};

function setupBindingButton(button, binding)
{
    if (binding.type === 'keydown')
    {
        if (keyDisplayMap[binding.key])
            button.innerText = keyDisplayMap[binding.key];
        else if (binding.key.length == 1) {
            // capitalize the key
            button.innerText = binding.key.toUpperCase();
        }
        else
        {
            button.innerText = binding.key;
        }
    }
    else if (binding.type === 'mousedown')
    {
        if (binding.button < 3)
            button.innerText = 'Mouse ' + ['L', 'M', 'R'][binding.button];
        else
            button.innerText = 'Mouse ' + binding.button;
    }
    else {
        button.innerText = `Unknown: ${binding.type}`;
    }

    button.setAttribute('binding-data', JSON.stringify(binding));
    button.onclick = () => {
        handleDeleteBinding(button);
    };
}

function recordBinding(binding)
{
    const button = document.querySelector('.button-binding-recording');

    // check if there are any duplicate bindings
    const action = button.parentElement.parentElement.parentElement.getAttribute('target-action');
    const bindings = keybinds.keyBindings[action].binds;
    for (let i = 0; i < bindings.length; i++)
    {
        if (JSON.stringify(bindings[i]) === JSON.stringify(binding))
        {
            // if the binding is a duplicate, don't add it
            return;
        }
    }

    setupBindingButton(button, binding);
    button.classList.remove('button-binding-recording');

    keybinds.keyBindings[action].binds.push(binding);

    isRecordingBinding = false;

    // re-enable all buttons
    const addButtons = document.querySelectorAll('button.binding-disabled');
    addButtons.forEach(addButton => {
        addButton.disabled = false;
    });

    storageSetItem('keybinds', keybinds.stringifyKeybinds());
    keybinds.setupKeyBindings(keybinds.keyBindings);
}

function onKeyDown(event)
{
    if (isRecordingBinding)
    {
        recordBinding({type: 'keydown', key: event.key});
    }

    const actions = keybinds.keydownBinds[event.key];
    if (actions) {
        actions.forEach(action => {
            keybinds.keyBindings[action].action();
        });
    }
}

function onMouseDown(event) {
    // if recording and the target is not a button, record the binding
    if (isRecordingBinding && !(event.target && event.target.tagName === 'BUTTON' && !event.target.disabled))
    {
        recordBinding({type: 'mousedown', button: event.button});
    }

    const actions = keybinds.mousedownBinds[event.button];
    if (actions) {
        actions.forEach(action => {
            keybinds.keyBindings[action].action();
        });
    }
};

function movePlanar(theta)
{
    // find the vector that matches the camera's direction
    tmpVector.set(Math.sin(orientationRadian + theta), 0, Math.cos(orientationRadian + theta));
    let bestVec = undefined;
    let bestDot = -1;
    XZVECS.forEach((vec) => {
        let num = tmpVector.dot(vec);
        if (num > bestDot) {
            bestDot = num;
            bestVec = vec;
        }
    });
    move(bestVec.x, bestVec.y, bestVec.z);
}

// let mouseX, mouseY;
let touchStartX, touchStartY;
let lookFracX = 0, lookFracY = 0;

function onMouseMove(event)
{
    let mouseX = event.clientX;
    let mouseY = event.clientY;

    // Get the total width and height of the screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const convFactor = Math.min(screenWidth, screenHeight);

    lookFracX = (mouseX - (screenWidth  * 0.5)) / convFactor;
    lookFracY = (mouseY - (screenHeight * 0.5)) / convFactor;
}

function onTouchStart(event)
{
    if (event.touches.length == 1)
    {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }
}

function onTouchMove(event)
{
    if (event.touches.length == 1)
    {
        let deltaX = event.touches[0].clientX - touchStartX;
        let deltaY = event.touches[0].clientY - touchStartY;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;

        lookFracX += deltaX / window.innerWidth;
        lookFracY += deltaY / window.innerHeight;

        lookFracX = Math.min(0.75, Math.max(-0.75, lookFracX));
        lookFracY = Math.min(0.75, Math.max(-0.75, lookFracY));
    }

}

function move(x, y, z)
{
    if (!playing)
        return;

    // move
    game.updateDirection(x, y, z);
}

function onWindowResize()
{
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function setMenu(menuId)
{
    document.querySelectorAll('.menu').forEach(menu => {
        menu.classList.remove('menu-active');
    });

    if (menuId == null)
        return;

    document.getElementById(menuId).classList.add('menu-active');
}

function updateCameraPosition()
{
    // smooth the edges
    let finalFracX = Math.tanh(3 * lookFracX);
    let finalFracY = Math.tanh(3 * lookFracY);

    const maxbounds = 6;
    camera.position.set(-finalFracX * maxbounds, finalFracY * maxbounds, 12);
    camera.lookAt(0, 0, 0);
}

function updateBackgroundColor()
{
    const timeDiff = Date.now() - backgroundTimeStamp;
    const fadeDuration = tickInterval * 3;
    const color = tmpColor.copy(damageColor).lerp(blackColor, timeDiff / fadeDuration);

    renderer.setClearColor(color, 1);
}

function updateOrientationAngle(delta)
{
    // find if we need to rotate positive or negative
    let diff = Math.sign(orientationTarget - orientationRadian);

    // rotate the rotateNode towards the direction
    let rotateAmount = diff * delta * 3;
    if (Math.abs(orientationTarget - orientationRadian) < Math.abs(rotateAmount)) {
        orientationRadian = orientationTarget;
    } else {
        orientationRadian += rotateAmount;
    }
    rotateNode.rotation.y = orientationRadian;
}

function handleGameOver()
{
    setPlaying(false);
    setMenu('menu-main');
}

function handleInvalidMove()
{
    // update the relevant life icon
    document.querySelector(`.snake-life[snake-life-idx='${game.lifeCount}']`).innerText = '⬛';

    // pulse the background color
    backgroundTimeStamp = Date.now();
}

var animate = function ()
{
    let delta = Math.min(fpsClock.getDelta(), 0.1);

    updateCameraPosition();
    updateBackgroundColor();
    updateOrientationAngle(delta);

    requestAnimationFrame( animate );

    renderer.render( scene, camera );
};

// setup buttons
let menuQueue = [];

document.querySelectorAll('.button-play').forEach(button => {
    button.onclick = () => {
        setMenu(null);

        clearTimeout(moveLoopTimeoutId);
        initGame();
        setPlaying(true);

        document.querySelector('#snake-realtime-length').innerHTML = game.nodes.length;
        boundsMaterial.uniforms.playerPosition.value = game.nodes[0].position;
    }
});

// query all elements with any value for attribute 'target-menu' and have it set the menu to that value
document.querySelectorAll('[target-menu]').forEach(button => {
    button.onclick = () =>
    {
        const currentMenuId = document.querySelector('.menu.menu-active').id;
        menuQueue.push(currentMenuId);
        setMenu(button.getAttribute('target-menu'));
    }
});

document.querySelectorAll('.button-back').forEach(button => {
    button.onclick = () =>
    {
        // pop the menu queue
        if (menuQueue.length > 0)
        {
            setMenu(menuQueue.pop());
        }
        else
        {
            setMenu('menu-main');
        }
    }
});

document.querySelectorAll('.button-resume').forEach(button => {
    button.onclick = () =>
    {
        setPlaying(true);
    }
});

document.querySelectorAll('.button-fullscreen').forEach(button => {
    button.onclick = () =>
    {
        if (document.fullscreenElement)
        {
            document.exitFullscreen();
        }
        else
        {
            document.documentElement.requestFullscreen();
        }
    }
});

document.addEventListener('fullscreenchange', (event) => {
    const fullscreenButtons = document.querySelectorAll('.button-fullscreen');
    fullscreenButtons.forEach(button => {
        button.innerText = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
    });
});

// ====

init();

animate();
