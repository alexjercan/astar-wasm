import Allocator from "./allocator";
import { Position, PositionArray, PathfindFunction } from "./astar";

class World {
    allocator: Allocator;
    width: number;
    height: number;
    cellSize: number;

    canvas: HTMLCanvasElement;
    map: boolean[][];
    path: Position[];

    constructor(allocator: Allocator, width: number, height: number, cellSize: number) {
        this.allocator = allocator;
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;

        this.canvas = null;
        this.map = new Array(height).fill(0).map(() => new Array(width).fill(false));
        this.path = null;

        let root = document.createElement("div");
        root.id = "root";
        document.body.appendChild(root);

        let canvas = document.createElement("canvas");
        canvas.width = this.width * this.cellSize;
        canvas.height = this.height * this.cellSize;
        root.appendChild(canvas);

        let runButton = document.createElement("button");
        runButton.textContent = "Run";
        runButton.onclick = () => {
            this.path = null;
            this.pathfind();
            this.renderWorld();
        };
        root.appendChild(runButton);

        canvas.addEventListener("click", (e) => {
            let x = Math.floor(e.offsetX / this.cellSize);
            let y = Math.floor(e.offsetY / this.cellSize);

            this.map[y][x] = !this.map[y][x];
            this.renderWorld();
        });

        this.canvas = canvas;
    }

    renderWorld(): void {
        let ctx = this.canvas.getContext("2d");
        ctx.clearRect(0, 0, this.width * this.cellSize, this.height * this.cellSize);

        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        for (let i = 0; i < this.width; i++) {
            ctx.beginPath();
            ctx.moveTo(i * this.cellSize, 0);
            ctx.lineTo(i * this.cellSize, this.height * this.cellSize);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(this.width * this.cellSize, 0);
        ctx.lineTo(this.width * this.cellSize, this.height * this.cellSize);
        ctx.stroke();

        for (let i = 0; i < this.height; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * this.cellSize);
            ctx.lineTo(this.width * this.cellSize, i * this.cellSize);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(0, this.height * this.cellSize);
        ctx.lineTo(this.width * this.cellSize, this.height * this.cellSize);
        ctx.stroke();

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.map[y][x]) {
                    ctx.fillStyle = "black";
                    ctx.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }

        if (this.path !== null && this.path.length > 1) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.path[0].x * this.cellSize + this.cellSize / 2, this.path[0].y * this.cellSize + this.cellSize / 2);
            for (let i = 1; i < this.path.length; i++) {
                ctx.lineTo(this.path[i].x * this.cellSize + this.cellSize / 2, this.path[i].y * this.cellSize + this.cellSize / 2);
            }
            ctx.stroke();
        }
    }

    pathfind(): number {
        this.allocator.reset();

        let start = new Position(0, 0);
        let end = new Position(this.width - 1, this.height - 1);
        let path = new PositionArray([], 0, 1024);

        let positions: Position[] = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.map[y][x]) {
                    positions.push(new Position(x, y));
                }
            }
        }
        let obstacles = new PositionArray(positions, positions.length, positions.length);

        let obstaclesPtr = obstacles.alloc(this.allocator);
        let startPtr = start.alloc(this.allocator);
        let endPtr = end.alloc(this.allocator);
        let pathPtr = path.alloc(this.allocator);

        let pathfind = w.instance.exports.pathfind as PathfindFunction;
        let result = pathfind(obstaclesPtr, this.width, this.height, startPtr, endPtr, pathPtr);

        path = PositionArray.decode(this.allocator.memory, pathPtr);
        this.path = path.items;

        console.log(result);
        console.log(path);

        return result;
    }
}

let w: WebAssembly.WebAssemblyInstantiatedSource = null;
let allocator: Allocator = null;

WebAssembly.instantiateStreaming(fetch("astar.wasm"), {
    env: {
        memory: new WebAssembly.Memory({ initial: 256 }),
        astar_malloc: (sz: number): number => {
            return allocator.malloc(sz);
        },
        astar_realloc: (ptr: number, oldSz: number, newSz: number): number => {
            return allocator.realloc(ptr, oldSz, newSz);
        },
        astar_free: (ptr: number): void => {
            allocator.free(ptr);
        },
        astar_exit: (code: number): void => {
            console.log(`Exit: ${code}`);
        }
    },
}).then((value) => {
    w = value;
    allocator = new Allocator(
        new Uint8Array((w.instance.exports.memory as WebAssembly.Memory).buffer),
        (w.instance.exports.__heap_base as WebAssembly.Global).value,
    );

    let world = new World(allocator, 10, 10, 50);

    world.renderWorld();
});
