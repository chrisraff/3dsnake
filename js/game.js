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

var mazeSize;

// game state
var game;
var moveLoopTimeoutId;
var tickInterval = 350;

var cubeMaterial;
var foodMaterial;

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

    // set camera position
    camera.position.set(1, 1, 12);
    camera.lookAt(0, 0, 0);

    tmpColor = new THREE.Color();

    // materials;
    cubeMaterial = new THREE.MeshLambertMaterial( {color: '#cccccc' } );
    foodMaterial = new THREE.MeshLambertMaterial( {color: '#ff0000' } );

    // set up lights
    let localLight = new THREE.PointLight( 0xffffff, 100 );
    camera.add( localLight );
    scene.add( camera );
    let ambLight = new THREE.AmbientLight( 0x808080 );
    scene.add( ambLight );

    // tmpVector = new THREE.Vector3();

    cube_geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    // const material = new MeshBasicMaterial();
    // const cube = new THREE.Mesh(cube_geometry, cubeMaterial);

    // scene.add(cube);

    game = new SnakeGame();
    game.context = {
        'cubeGeometry': cube_geometry,
        'material': cubeMaterial,
        'foodMaterial': foodMaterial,
        'scene': scene
    }

    // setup window resize handlers
    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'orientationchange', onWindowResize, false );

    window.addEventListener( 'keypress', onKeyPress, false);

    reset();

    moveLoopTimeoutId = setTimeout(moveLoop, tickInterval);
}

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

var animate = function ()
{
    let delta = Math.min(fpsClock.getDelta(), 0.1);

    requestAnimationFrame( animate );

    renderer.render( scene, camera );
};

init();

animate();
