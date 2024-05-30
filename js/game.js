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

const PI_2 = Math.PI / 2;

// models
var cube_geometry;
var bounds_geometry;

// game state
var game;
var moveLoopTimeoutId;
var tickInterval = 350;

var cubeMaterial;
var foodMaterial;
var boundsMaterial;

var boundsMesh;

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
    // boundsMaterial = new THREE.MeshLambertMaterial( {color: 'rgba(200,200,200,0)', side: THREE.BackSide, specular: 0xffffff } );
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
    scene.add( camera );
    let ambLight = new THREE.AmbientLight( 0x808080 );
    scene.add( ambLight );

    // tmpVector = new THREE.Vector3();

    cube_geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    bounds_geometry = new THREE.BoxGeometry(1, 1, 1);
    // const material = new MeshBasicMaterial();
    // const cube = new THREE.Mesh(cube_geometry, cubeMaterial);

    boundsMesh = new THREE.Mesh(bounds_geometry, boundsMaterial);
    scene.add(boundsMesh);

    // scene.add(cube);

    game = new SnakeGame();
    game.context = {
        'cubeGeometry': cube_geometry,
        'material': cubeMaterial,
        'foodMaterial': foodMaterial,
        'boundsMesh': boundsMesh,
        'scene': scene,
        'document': document
    }

    // setup window resize handlers
    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'orientationchange', onWindowResize, false );

    window.addEventListener( 'keypress', onKeyPress, false);
    window.addEventListener( 'mousemove', onMouseMove, false );

    document.addEventListener('mousedown', function(event) {
        if (event.button === 0) {
            // Left mouse button was clicked
            move(0, 0, -1);
        }
    });

      // Add a contextmenu event listener for the right mouse button (button 2)
      document.addEventListener('contextmenu', function(event) {
        event.preventDefault(); // Prevent the default context menu from appearing
        if (event.button === 2) {
            // Right mouse button was clicked
            move(0, 0, 1);
        }
    });

    //
    reset();

    moveLoopTimeoutId = setTimeout(moveLoop, tickInterval);
}

// set initial conditions for game
function reset()
{
    game.init();

    for (let i = 0; i < game.nodes.length; i++)
    {
        scene.add(game.nodes[i]);
    }
}

function moveLoop()
{
    game.tick();

    boundsMaterial.uniforms.playerPosition.value = game.nodes[0].position;

    moveLoopTimeoutId = setTimeout(moveLoop, tickInterval);
}

function onKeyPress(event)
{
    let direction = [0, 0, 0];
    switch (event.code)
    {
        case 'KeyD':
            direction[0] = 1;
            break;
        case 'KeyA':
            direction[0] = -1;
            break;
        case 'KeyW':
            direction[1] = 1;
            break;
        case 'KeyS':
            direction[1] = -1;
            break;
        case 'KeyQ':
            direction[2] = 1;
            break;
        case 'KeyE':
            direction[2] = -1;
            break;
    }

    move(...direction);
}

let mouseX, mouseY;

function onMouseMove(event)
{
    mouseX = event.clientX;
    mouseY = event.clientY;
}

function move(x, y, z)
{
    // move
    game.updateDirection(x, y, z);
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function updateCameraPosition()
{
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

var animate = function ()
{
    let delta = Math.min(fpsClock.getDelta(), 0.1);

    updateCameraPosition();

    requestAnimationFrame( animate );

    renderer.render( scene, camera );
};

init();

animate();
