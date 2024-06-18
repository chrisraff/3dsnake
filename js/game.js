/**
 * @author Chris Raff / http://www.ChrisRaff.com/
 */
import * as THREE from 'three';
import { SnakeGame } from './snake.js';

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

var cubeMaterial;
var foodMaterial;
var boundsMaterial;

var boundsMesh;

var rotateNode;

// colors
const damageColor = new THREE.Color(0.1, 0.0, 0.0);
const blackColor = new THREE.Color(0.0, 0.0, 0.0);

// key bindings
let keyBindings = {
    'actionUp': {
        'desc': 'Up',
        'binds': [
            {
                'type': 'keydown',
                'key': 'w'
            }
        ],
        'action': function() {
            move(0, 1, 0);
        }
    },
    'actionDown': {
        'desc': 'Down',
        'binds': [
            {
                'type': 'keydown',
                'key': 's'
            }
        ],
        'action': function() {
            move(0, -1, 0);
        }
    },
    'actionLeft': {
        'desc': 'Left',
        'binds': [
            {
                'type': 'keydown',
                'key': 'a'
            }
        ],
        'action': function() {
            movePlanar(-PI_2);
        }
    },
    'actionRight': {
        'desc': 'Right',
        'binds': [
            {
                'type': 'keydown',
                'key': 'd'
            }
        ],
        'action': function() {
            movePlanar(PI_2);
        }
    },
    'actionIn': {
        'desc': 'In',
        'binds': [
            {
                'type': 'mousedown',
                'button': 0
            }
        ],
        'action': function() {
            movePlanar(0);
        }
    },
    'actionOut': {
        'desc': 'Out',
        'binds': [
            {
                'type': 'mousedown',
                'button': 2
            }
        ],
        'action': function() {
            movePlanar(Math.PI);
        }
    },
    'actionRotateLeft': {
        'desc': 'Rotate Left',
        'binds': [
            {
                'type': 'keydown',
                'key': 'q'
            }
        ],
        'action': function() {
            orientationTarget += PI_2;
        }
    },
    'actionRotateRight': {
        'desc': 'Rotate Right',
        'binds': [
            {
                'type': 'keydown',
                'key': 'e'
            }
        ],
        'action': function() {
            orientationTarget -= PI_2;
        }
    }
}

let keydownBinds = {};
let mousedownBinds = {};

function init() {

    // loadSavedVariables();

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

    window.addEventListener( 'keydown', onKeyDown, false);
    window.addEventListener( 'mousemove', onMouseMove, false );

    document.addEventListener('mousedown', onMouseDown, false);

    // setup keybindings
    setupKeyBindings(keyBindings);

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

function pauseGame()
{
    if (!playing)
        return;

    playing = false;
    clearTimeout(moveLoopTimeoutId);
    setMenu('menu-pause');
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

// convert the key bindings to a button map for quick lookup
function setupKeyBindings(keyBindings) {
    keydownBinds = {};
    mousedownBinds = {};

    for (const action in keyBindings) {
        const actionObj = keyBindings[action];

        // Check if the action object has 'binds' and it's an array
        if (Array.isArray(actionObj.binds)) {
            actionObj.binds.forEach(bind => {
                // Only process 'keydown' types
                if (bind.type === 'keydown') {
                    const key = bind.key;
                    if (!keydownBinds[key]) {
                        keydownBinds[key] = [];
                    }
                    keydownBinds[key].push(action);
                }
                if (bind.type === 'mousedown') {
                    const button = bind.button;
                    if (!mousedownBinds[button]) {
                        mousedownBinds[button] = [];
                    }
                    mousedownBinds[button].push(action);
                }
            });
        }
    }
}

function onKeyDown(event)
{
    const actions = keydownBinds[event.key];
    if (actions) {
        actions.forEach(action => {
            keyBindings[action].action();
        });
    }
}

function onMouseDown(event) {
    const actions = mousedownBinds[event.button];
    if (actions) {
        actions.forEach(action => {
            keyBindings[action].action();
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

let mouseX, mouseY;

function onMouseMove(event)
{
    mouseX = event.clientX;
    mouseY = event.clientY;
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
    // if either mouseX or mouseY is undefined, don't update the camera position
    if (mouseX === undefined || mouseY === undefined)
        return;

    // Get the total width and height of the screen
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    const convFactor = Math.min(screenWidth, screenHeight);

    let mouseFracX = (mouseX - (screenWidth  * 0.5)) / convFactor;
    let mouseFracY = (mouseY - (screenHeight * 0.5)) / convFactor;

    // smooth the edges
    mouseFracX = Math.tanh(3 * mouseFracX) / 2;
    mouseFracY = Math.tanh(3 * mouseFracY) / 2;

    camera.position.set(-mouseFracX * 8, mouseFracY * 8, 12);
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
    setMenu('menu-main');
    playing = false;
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

init();

// setup buttons
let menuQueue = [];

document.querySelectorAll('.button-play').forEach(button => {
    button.onclick = () => {
        setMenu(null);

        clearTimeout(moveLoopTimeoutId);
        moveLoopTimeoutId = setTimeout(moveLoop, tickInterval);
        initGame();
        playing = true;

        document.querySelector('#snake-realtime-length').innerHTML = game.nodes.length;
        boundsMaterial.uniforms.playerPosition.value = game.nodes[0].position;
    }
});

document.querySelectorAll('.button-options').forEach(button => {
    button.onclick = () =>
    {
        // push the current menu onto the queue
        const currentMenuId = document.querySelector('.menu.menu-active').id;
        menuQueue.push(currentMenuId);
        setMenu('menu-options');
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
        setMenu(null);
        playing = true;
        moveLoopTimeoutId = setTimeout(moveLoop, tickInterval);
    }
});

animate();
