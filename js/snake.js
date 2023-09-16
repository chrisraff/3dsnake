/**
 * @author Chris Raff / http://www.ChrisRaff.com/
 */
import * as THREE from 'three';

class SnakeGame {
    constructor()
    {
        this.nodes = [];
        this.direction = new THREE.Vector3();
        this.startLength = 4;
        this.context = {};
    }

    init = function()
    {
        this.direction.set(1, 0, 0);

        // TODO clean up previous nodes if they have unique materials
        this.nodes = [];

        for (let i = 0; i < this.startLength; i++)
        {
            this.nodes[i] = new THREE.Mesh(this.context.cubeGeometry, this.context.material);
            this.nodes[i].position.addScaledVector(this.direction, -i);
        }
    }
}

export { SnakeGame };
