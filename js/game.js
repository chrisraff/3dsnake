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
var game = null;

var cubeMaterial;
var darkMaterial;

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
        'material': cubeMaterial
    }

    // setup window resize handlers
    window.addEventListener( 'resize', onWindowResize, false );
    window.addEventListener( 'orientationchange', onWindowResize, false );

    window.addEventListener( 'keypress', onKeyPress, false);

    reset();
}

function reset()
{
    game.init();

    for (let i = 0; i < game.nodes.length; i++)
    {
        scene.add(game.nodes[i]);
    }
}

function onKeyPress(event)
{
    let direction = [0, 0, 0];
    switch (event.code)
    {
        case 'KeyW':
            direction[0] = 2;
            break;
        case 'KeyS':
            direction[0] = -2;
            break;
        case 'KeyE':
            direction[1] = 2;
            break;
        case 'KeyQ':
            direction[1] = -2;
            break;
        case 'KeyD':
            direction[2] = 2;
            break;
        case 'KeyA':
            direction[2] = -2;
            break;
    }

    move(...direction);
}

function move(x, y, z)
{
    // move
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
