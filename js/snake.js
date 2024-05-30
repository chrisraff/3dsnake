/**
 * @author Chris Raff / http://www.ChrisRaff.com/
 */
import * as THREE from 'three';
import { _SRGBAFormat } from 'three';

var tmpVector = new THREE.Vector3();

class SnakeGame {
    constructor()
    {
        this.nodes = [];
        this.foodNodes = [];
        this.direction = new THREE.Vector3();
        this.nextDirection = new THREE.Vector3();
        this.startLength = 4;
        this.context = {};
        this.bounds = [5, 5, 5];
        this.lifeCount = 3;

        this.isMakingInvalidMove = false;
    }

    init = function()
    {
        this.direction.set(1, 0, 0);
        this.nextDirection.copy(this.direction);

        // TODO clean up previous nodes if they have unique materials
        for (let i = 0; i < this.nodes.length; i++)
        {
            this.nodes[i].removeFromParent();
        }
        this.nodes = [];
        this.foodNodes = [];
        this.lifeCount = 3;
        this.isMakingInvalidMove = false;

        for (let i = 0; i < this.startLength; i++)
        {
            this.nodes[i] = new THREE.Mesh(this.context.cubeGeometry, this.context.material);
            this.nodes[i].position.addScaledVector(this.direction, -i);
            this.context.scene.add(this.nodes[i]);
        }

        this.context.boundsMesh.scale.set(...this.bounds);

        this.spawnFood();

        this.context.document.querySelector('.snake-life').innerText = '🟩';
    }

    spawnFood = function()
    {
        const idx = this.foodNodes.length;
        this.foodNodes[idx] = new THREE.Mesh(this.context.cubeGeometry, this.context.foodMaterial);
        tmpVector.copy(this.nodes[0].position);

        // find a valid position to spawn the food
        while (this.intersectsAny(tmpVector))
        {
            for (let i = 0; i < 3; i++)
                tmpVector.setComponent(i, Math.floor(Math.random() * this.bounds[i] - Math.floor(this.bounds[i]/2)));
        }

        this.foodNodes[idx].position.copy(tmpVector);
        this.context.scene.add(this.foodNodes[idx]);
    }

    tick = function()
    {
        if (this.lifeCount == 0)
            return;

        // check if the snake is about to eat itself
        tmpVector.copy(this.nodes[0].position);
        tmpVector.add(this.nextDirection);
        this.isMakingInvalidMove = this.intersectsSnake(tmpVector) && !tmpVector.equals(this.nodes[this.nodes.length-1].position);
        if (this.isMakingInvalidMove)
        {
            // update the relevant life icon
            this.lifeCount -= 1;
            this.context.document.querySelector(`.snake-life[snake-life-idx='${this.lifeCount}']`).innerText = '⬛';

            // do not execute any further steps this tick
            return;
        }

        // set the new direction
        this.direction.copy(this.nextDirection);
        tmpVector.copy(this.nodes[this.nodes.length-1].position);

        for (let i = this.nodes.length - 1; i > 0; i--)
        {
            this.nodes[i].position.copy(this.nodes[i-1].position);
        }

        this.nodes[0].position.add(this.direction);

        // check for food collision
        const idx = this.intersectsFood(this.nodes[0].position);
        if (idx != null)
        {
            // add a new node to the snake
            const node_idx = this.nodes.length;
            this.nodes[node_idx] = new THREE.Mesh(this.context.cubeGeometry, this.context.material);
            this.nodes[node_idx].position.copy(tmpVector);
            this.context.scene.add(this.nodes[node_idx]);

            // remove the old food item
            this.foodNodes[idx].removeFromParent();
            this.foodNodes.splice(idx, 1);

            this.spawnFood();
        }
    }

    updateDirection(x, y, z)
    {
        // don't allow the player to go backwards into themselves
        if (this.direction.x == -x && this.direction.y == -y && this.direction.z == -z)
            return;

        if (Math.abs(x + y + z) != 1)
            return;

        this.nextDirection.set(x, y, z);
    }

    intersectsAny = function(vec)
    {
        return this.intersectsSnake(vec) || (this.intersectsFood(vec) != null);
    }

    intersectsSnake = function(vec)
    {
        for (let i = 0; i < this.nodes.length; i++)
        {
            if (this.nodes[i].position.equals(vec))
            {
                return true;
            }
        }
        return false;
    }

    intersectsFood = function(vec)
    {
        for (let i = 0; i < this.foodNodes.length; i++)
        {
            if (this.foodNodes[i].position.equals(vec))
            {
                return i;
            }
        }
        return null;
    }
}

export { SnakeGame };

