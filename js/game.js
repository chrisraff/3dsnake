/**
 * @author Chris Raff / http://www.ChrisRaff.com/
 */
import * as THREE from 'three';
import { SnakeGame } from './snake.js';
import * as keybinds from './keybinds.js';
import { storageSetItem, storageGetItem } from './storage.js';

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

var showTutorial = true;
var tickEnabled = true;

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

    tmpVector = new THREE.Vector3();

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

    // Add a touchmove event listener to prevent the default refresh gesture
    document.addEventListener('touchmove', function(event) {
        // console.log(event.target);
        let targetElement = event.target;
        let isScrollableElement = false;

        while (targetElement !== null) {
            if (targetElement.classList.contains('leaderboard-container')) {
            isScrollableElement = true;
            break;
            }
            targetElement = targetElement.parentElement;
        }

        if (!isScrollableElement) {
            event.preventDefault();
        }
    }, { passive: false });

    // If the user hasn't played in 90 days, show the tutorial
    try {
        const lastPlayed = Number(storageGetItem('lastPlayed', '0'));
        const now = Date.now();
        const timeSinceLastPlayed = now - lastPlayed;
        showTutorial = timeSinceLastPlayed > 1000 * 60 * 60 * 24 * 90;
    } catch (error) {
        console.error(error);
    }

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
    if (tickEnabled)
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
    document.body.classList.remove('menu-overlay-active');

    if (menuId == null)
        return;

    document.getElementById(menuId).classList.add('menu-active');
    document.body.classList.add('menu-overlay-active');
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
    if (tutorialData.inTutorial)
    {
        resetTutorial();
    }

    // get the scores from local storage
    const storedScores = storageGetItem('scores', '[]');
    let scores = [];

    if (storedScores) {
        scores = JSON.parse(storedScores);
    }

    const currentDate = Date.now();

    // add the current score to the scores array
    scores.push({ length: game.nodes.length, date: currentDate, mode: 'n' });
    // sort the scores by score in descending order
    scores.sort((a, b) => {
        if (a.length === b.length) {
            return a.date - b.date; // sort by older dates first if lengths are equal
        }
        return b.length - a.length;
    });

    // only keep the top 10 scores
    scores = scores.slice(0, 10);

    // save the scores back to local storage
    storageSetItem('scores', JSON.stringify(scores));

    // populate the leaderboard table
    const leaderboard = document.querySelector('#leaderboard');
    leaderboard.innerHTML = '';
    const header = document.createElement('tr');
    const rankHeader = document.createElement('th');
    const scoreHeader = document.createElement('th');
    const dateHeader = document.createElement('th');

    rankHeader.innerText = 'Rank';
    scoreHeader.innerText = 'Length';
    dateHeader.innerText = 'Date';

    header.appendChild(rankHeader);
    header.appendChild(scoreHeader);
    header.appendChild(dateHeader);

    leaderboard.appendChild(header);

    var focusRow = null;

    scores.forEach((score, idx) => {
        const row = document.createElement('tr');
        const rank = document.createElement('td');
        const scoreCell = document.createElement('td');
        const date = document.createElement('td');

        rank.innerText = idx + 1;
        scoreCell.innerText = score.length;
        date.innerText = new Date(score.date).toLocaleDateString();

        scoreCell.style.fontWeight = 'bold';

        row.appendChild(rank);
        row.appendChild(scoreCell);
        row.appendChild(date);

        if (score.date === currentDate) {
            row.style.animationName = 'leaderboard-highlight';
            row.style.animationDuration = '1s';
            row.style.animationIterationCount = 'infinite';
            focusRow = row;
        }

        leaderboard.appendChild(row);
    });

    setPlaying(false);
    setMenu('menu-gameover');
    storageSetItem('lastPlayed', Date.now());

    // first, scroll to top
    header.scrollIntoView();
    // then, scroll to the highlighted row
    if (focusRow) {
        focusRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function handleInvalidMove()
{
    // update the relevant life icon
    document.querySelector(`.snake-life[snake-life-idx='${game.lifeCount}']`).innerText = '⬛';

    // pulse the background color
    backgroundTimeStamp = Date.now();
}

var tutorialData =
{
    state: 'move-screenplane',
    inTutorial: false,
    lastLoggedTime: 0,
    foodMap: {
        4: [1, 1, 0],
        5: [-2, -2, 0],
        6: [-2, -2, -2],
        7: [1, 1, -2],
        8: [1, 1, 0],
        9: [-2, 2, 0],
    }
}
function initTutorial()
{
    tutorialData.inTutorial = true;
    tutorialData.state = 'move-screenplane';

    // disable in / out
    tutorialData.inAction = keybinds.keyBindings.actionIn.action;
    tutorialData.outAction = keybinds.keyBindings.actionOut.action;
    keybinds.keyBindings.actionIn.action = keybinds.nullAction;
    keybinds.keyBindings.actionOut.action = keybinds.nullAction;
    document.querySelector('.inoutpad').classList.add('hide');

    // disable rotation
    tutorialData.rotateLeftAction = keybinds.keyBindings.actionRotateLeft.action;
    tutorialData.rotateRightAction = keybinds.keyBindings.actionRotateRight.action;
    keybinds.keyBindings.actionRotateLeft.action = keybinds.nullAction;
    keybinds.keyBindings.actionRotateRight.action = keybinds.nullAction;
    document.querySelector('.rotatepad').classList.add('hide');

    document.querySelector('#tutorial-move-screenplane').classList.remove('hide');
    document.querySelector('#tutorial-move-screenplane').style.animationName = 'tutorial-text-fade-in;'
    document.querySelector('#tutorial-move-screenplane').style.animationFillMode = 'forwards';

    document.querySelector('.dpad').style.animationName = 'tutorial-highlight-secondary';
    document.querySelector('.dpad').style.animationDuration = '1s';
    document.querySelector('.dpad').style.animationIterationCount = '5';
}
function handleTutorial()
{
    if (!tutorialData.inTutorial)
        return;

    // set the food's position explicitly for the tutorial
    game.foodNodes[0].position.set(...tutorialData.foodMap[game.nodes.length]);

    switch (tutorialData.state)
    {
        case 'move-screenplane':
        {
            // if the player is about to move past 3 on any axis, disable the movement
            tmpVector.copy(game.nodes[0].position).add(game.nextDirection);
            tickEnabled = true;
            for (let i = 0; i < 3; i++)
            {
                if (Math.abs(tmpVector.getComponent(i)) > 3)
                {
                    tickEnabled = false;
                }
            }
            document.querySelectorAll('.tip-different-direction').forEach(element => {
                element.classList.toggle('hide', tickEnabled);
            });

            // check if the player has eaten two foods
            if (game.nodes.length > 5)
            {
                tutorialData.state = 'move-in';
                // reenable in / out
                keybinds.keyBindings.actionIn.action = tutorialData.inAction;
                keybinds.keyBindings.actionOut.action = tutorialData.outAction;
                document.querySelector('.inoutpad').classList.remove('hide');

                document.querySelector('#tutorial-move-screenplane').style.animationName = 'tutorial-text-fade-out';
                document.querySelector('#tutorial-move-screenplane').style.animationFillMode = 'forwards';
                document.querySelector('.dpad').style.animationName = '';

                document.querySelector('#tutorial-move-in').classList.remove('hide');
                document.querySelector('#tutorial-move-in').style.animationName = 'tutorial-text-fade-in';
                document.querySelector('#tutorial-move-in').style.animationFillMode = 'forwards';
                document.querySelector('.dpad-in').style.animationName = 'tutorial-highlight-secondary';
                document.querySelector('.dpad-in').style.animationDuration = '1s';
                document.querySelector('.dpad-in').style.animationIterationCount = '5';

                tickEnabled = false;
            }
        }
        break;
        case 'move-in':
        {
            tickEnabled = game.nextDirection.equals(VECZN);

            // check if the player has eaten another food
            if (game.nodes.length > 6)
            {
                tutorialData.state = 'move-screenplane2';

                document.querySelector('#tutorial-move-in').style.animationName = 'tutorial-text-fade-out';
                document.querySelector('#tutorial-move-in').style.animationFillMode = 'forwards';
                document.querySelector('.dpad-in').style.animationName = '';

                document.querySelector('#tutorial-move-screenplane2').classList.remove('hide');
                document.querySelector('#tutorial-move-screenplane2').style.animationName = 'tutorial-text-fade-in';
                document.querySelector('#tutorial-move-screenplane2').style.animationFillMode = 'forwards';

                tickEnabled = false;
            }
        }
        break;
        case 'move-screenplane2':
        {
            tickEnabled = true;
            // if the player is about to move past 3 on any axis, disable the movement
            tmpVector.copy(game.nodes[0].position).add(game.nextDirection);
            for (let i = 0; i < 3; i++)
            {
                if (Math.abs(tmpVector.getComponent(i)) > 3)
                {
                    tickEnabled = false;
                }
            }
            document.querySelectorAll('.tip-different-direction').forEach(element => {
                element.classList.toggle('hide', tickEnabled);
            });

            // if the player isn't moving in the plane, also disable the tick
            if (game.nextDirection.z != 0)
                tickEnabled = false;

            // check if the player has eaten another food
            if (game.nodes.length > 7)
            {
                tutorialData.state = 'move-out';

                document.querySelector('#tutorial-move-screenplane2').style.animationName = 'tutorial-text-fade-out';
                document.querySelector('#tutorial-move-screenplane2').style.animationFillMode = 'forwards';

                document.querySelector('#tutorial-move-out').classList.remove('hide');
                document.querySelector('#tutorial-move-out').style.animationName = 'tutorial-text-fade-in';
                document.querySelector('#tutorial-move-out').style.animationFillMode = 'forwards';
                document.querySelector('.dpad-out').style.animationName = 'tutorial-highlight-secondary';
                document.querySelector('.dpad-out').style.animationDuration = '1s';
                document.querySelector('.dpad-out').style.animationIterationCount = '5';

                tickEnabled = false;
            }
        }
        break;
        case 'move-out':
        {
            tickEnabled = game.nextDirection.equals(VECZ);

            // check if the player has eaten another food
            if (game.nodes.length > 8)
            {
                tutorialData.state = 'move-panning';

                tutorialData.lastLoggedTime = Date.now();
                tutorialData.cameraPos = camera.position.clone();
                tutorialData.cameraDidMove = false;

                tickEnabled = false;

                document.querySelector('#tutorial-move-out').style.animationName = 'tutorial-text-fade-out';
                document.querySelector('#tutorial-move-out').style.animationFillMode = 'forwards';
                document.querySelector('.dpad-out').style.animationName = '';

                document.querySelector('#tutorial-move-panning').style.animationName = 'tutorial-text-fade-in';
                document.querySelector('#tutorial-move-panning').style.animationFillMode = 'forwards';
                document.querySelector('#tutorial-move-panning').classList.remove('hide');
            }
        }
        break;
        case 'move-panning':
        {
            // check if the player has moved the camera enough
            if (camera.position.distanceToSquared(tutorialData.cameraPos) > 3)
                tutorialData.cameraDidMove = true;

            if (Date.now() - tutorialData.lastLoggedTime > 3000 && tutorialData.cameraDidMove)
            {
                tutorialData.state = 'info-lives';
                tutorialData.lastLoggedTime = Date.now();
                if (game.lifeCount == 1)
                    game.lifeCount = 2;
                tutorialData.lifeCount = game.lifeCount;

                // reenable rotation
                keybinds.keyBindings.actionRotateLeft.action = tutorialData.rotateLeftAction;
                keybinds.keyBindings.actionRotateRight.action = tutorialData.rotateRightAction;
                document.querySelector('.rotatepad').classList.remove('hide');

                document.querySelector('#tutorial-move-panning').style.animationName = 'tutorial-text-fade-out';
                document.querySelector('#tutorial-move-panning').style.animationFillMode = 'forwards';

                document.querySelector('#tutorial-info-lives').style.animationName = 'tutorial-text-fade-in';
                document.querySelector('#tutorial-info-lives').style.animationFillMode = 'forwards';
                document.querySelector('#tutorial-info-lives').classList.remove('hide');

                // set #snake-lives to a blinking animation
                document.querySelector('#snake-lives').style.animationName = 'tutorial-highlight';
                document.querySelector('#snake-lives').style.animationDuration = '1s';
                document.querySelector('#snake-lives').style.animationIterationCount = '7';

                tickEnabled = true;
            }
        }
        break;
        case 'info-lives':
        {
            game.nextDirection.set(0, 0, 1);

            if (game.lifeCount != tutorialData.lifeCount)
                tickEnabled = false;

            // check if enough time has passed
            if (Date.now() - tutorialData.lastLoggedTime > 7000)
            {
                tickEnabled = true;

                tutorialData.state = 'finalFadeout';
                tutorialData.lastLoggedTime = Date.now();

                document.querySelector('#tutorial-info-lives').style.animationName = 'tutorial-text-fade-out';
                document.querySelector('#tutorial-info-lives').style.animationFillMode = 'forwards';
            }
        }
        break;
        case 'finalFadeout':
        {
            // check if 0.5 seconds have passed
            if (Date.now() - tutorialData.lastLoggedTime > 500)
            {
                // complete the tutorial
                resetTutorial(true);

                storageSetItem('lastPlayed', Date.now());
                setMenu('menu-tutorial-complete');
                setPlaying(false);
            }
        }
        break;
    }
}

function resetTutorial(complete = false)
{
    if (complete)
    {
        showTutorial = false;
    }

    // reenable all actions
    keybinds.keyBindings.actionIn.action = tutorialData.inAction;
    keybinds.keyBindings.actionOut.action = tutorialData.outAction;
    keybinds.keyBindings.actionRotateLeft.action = tutorialData.rotateLeftAction;
    keybinds.keyBindings.actionRotateRight.action = tutorialData.rotateRightAction;
    document.querySelector('.inoutpad').classList.remove('hide');
    document.querySelector('.rotatepad').classList.remove('hide');

    tutorialData.inTutorial = false;
    document.querySelectorAll('.tutorial-text').forEach(element => {
        element.classList.add('hide');
        element.style.animationName = '';
    });
    document.querySelector('#snake-lives').style.animationName = '';
}

var animate = function ()
{
    let delta = Math.min(fpsClock.getDelta(), 0.1);

    updateCameraPosition();
    updateBackgroundColor();
    updateOrientationAngle(delta);

    if (tutorialData.inTutorial)
    {
        handleTutorial();
    }

    requestAnimationFrame( animate );

    renderer.render( scene, camera );
};

// setup buttons
let menuQueue = [];

function onClickStart()
{
    setMenu(null);

    clearTimeout(moveLoopTimeoutId);
    initGame();
    setPlaying(true);

    if (showTutorial)
    {
        initTutorial();
    }

    document.querySelector('#snake-realtime-length').innerHTML = game.nodes.length;
    boundsMaterial.uniforms.playerPosition.value = game.nodes[0].position;
}

document.querySelectorAll('.button-play').forEach(button => {
    button.onclick = onClickStart;
});

function onClickTargetMenuButton(button)
{
    if (!button.hasAttribute('menu-no-queue')) {
        const currentMenuId = document.querySelector('.menu.menu-active').id;
        menuQueue.push(currentMenuId);
    }
    setMenu(button.getAttribute('target-menu'));
}

// query all elements with any value for attribute 'target-menu' and have it set the menu to that value
document.querySelectorAll('[target-menu]').forEach(button => {
    button.onclick = () => onClickTargetMenuButton(button);
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
document.querySelectorAll('.button-tutorial').forEach(button => {
    button.onclick = () =>
    {
        showTutorial = true;
        onClickStart();
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
