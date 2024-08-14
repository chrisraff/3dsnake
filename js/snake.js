/**
 * @author Chris Raff / http://www.ChrisRaff.com/
 */
import * as THREE from 'three';

var tmpVector = new THREE.Vector3();

class SnakeGame extends EventTarget {
    constructor()
    {
        super();

        this.nodes = [];
        this.foodNodes = [];
        this.direction = new THREE.Vector3();
        this.nextDirection = new THREE.Vector3();
        this.startLength = 4;
        this.context = {};
        this.foodBounds = [5, 5, 5];
        this.bounds = [13, 13, 13];
        this.lifeCount = 3;
        this.damageCooldown = 0;

        this.foodBoundsRamp = {
            60: [7, 7, 7],
            125: [9, 9, 9],
            375: [11, 11, 11],
            800: [13, 13, 13]
        }

        this.isMakingInvalidMove = false;
    }

    init = function()
    {
        this.cleanUpScene();

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

        this.foodBounds = [5, 5, 5];

        for (let i = 0; i < this.startLength; i++)
        {
            this.nodes[i] = new THREE.Mesh(this.context.cubeGeometry, this.context.material);
            this.nodes[i].position.addScaledVector(this.direction, -i);
            this.context.scene.add(this.nodes[i]);
        }

        this.context.boundsMesh.scale.set(...this.bounds);

        this.spawnFood();
    }

    cleanUpScene = function()
    {
        this.nodes.forEach(element => {
            element.removeFromParent();
        });
        this.foodNodes.forEach(element => {
            element.removeFromParent();
        });
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
                tmpVector.setComponent(i, Math.floor(Math.random() * this.foodBounds[i] - Math.floor(this.foodBounds[i]/2)));
        }

        this.foodNodes[idx].position.copy(tmpVector);
        this.context.scene.add(this.foodNodes[idx]);
    }

    tick = function()
    {
        if (this.lifeCount == 0)
            return;

        if (this.damageCooldown > 0)
        {
            this.damageCooldown -= 1;
        }

        // check if the snake is about to eat itself
        tmpVector.copy(this.nodes[0].position);
        tmpVector.add(this.nextDirection);
        this.isMakingInvalidMove = this.intersectsSnake(tmpVector) && !tmpVector.equals(this.nodes[this.nodes.length-1].position);
        this.isMakingInvalidMove = this.isMakingInvalidMove || this.outOfBounds(tmpVector);
        if (this.isMakingInvalidMove)
        {
            if (this.damageCooldown == 0)
            {
                this.lifeCount -= 1;
                this.dispatchEvent(new Event('invalidMove'));
                this.damageCooldown = 3;
            }

            if (this.lifeCount == 0)
            {
                this.dispatchEvent(new Event('gameOver'));
            }

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

            this.removeFood(idx);

            this.spawnFood();
        }

        // check for bounds increase
        if (this.foodBoundsRamp[this.nodes.length] != undefined)
        {
            this.foodBounds = this.foodBoundsRamp[this.nodes.length];
        }
    }

    removeFood = function(idx)
    {
        this.foodNodes[idx].removeFromParent();
        this.foodNodes.splice(idx, 1);
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

    outOfBounds = function(vec)
    {
        for (let i = 0; i < 3; i++)
        {
            if (Math.abs(vec[['x', 'y', 'z'][i]]) > this.bounds[i]/2)
            {
                return true;
            }
        }

        return false;
    }
}

export { SnakeGame };

