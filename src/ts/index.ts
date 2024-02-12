function parseWorld(input: string): [PositionArray, number, number] {
    let obstacles: Position[] = [];
    let lines = input.split("\n");
    for (let y = 0; y < lines.length; y++) {
        let line = lines[y];
        for (let x = 0; x < line.length; x++) {
            if (line[x] === "#") {
                obstacles.push(new Position(x, y));
            }
        }
    }

    return [new PositionArray(obstacles, obstacles.length, obstacles.length), lines[0].length, lines.length];
}

class Allocator {
    memory: Uint8Array;
    offset: number;

    constructor(memory: Uint8Array, offset: number) {
        this.memory = memory;
        this.offset = offset;
    }

    malloc(sz: number): number {
        const ptr = this.offset;
        this.offset += sz;
        return ptr;
    }

    realloc(ptr: number, oldSz: number, newSz: number): number {
        const newPtr = this.malloc(newSz);
        this.memory.set(this.memory.slice(ptr, ptr + oldSz), newPtr);
        return newPtr;
    }

    free(_ptr: number): void {
        console.log("Chads don't free");
    }
}

class Position {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    static decode(view: Uint8Array, ptr: number): Position {
        let x = new DataView(view.buffer, ptr, 4).getInt32(0, true);
        let y = new DataView(view.buffer, ptr + 4, 4).getInt32(0, true);

        return new Position(x, y);
    }

    encode(view: Uint8Array, ptr: number): void {
        new DataView(view.buffer, ptr, 4).setInt32(0, this.x, true);
        new DataView(view.buffer, ptr + 4, 4).setInt32(0, this.y, true);
    }

    alloc(allocator: Allocator): number {
        let view = allocator.memory;
        let ptr = allocator.malloc(8);

        this.encode(view, ptr);

        return ptr;
    }
}

class PositionArray {
    items: Position[];
    count: number;
    capacity: number;

    constructor(items: Position[], count: number, capacity: number) {
        this.items = items;
        this.count = count;
        this.capacity = capacity;
    }

    static decode(view: Uint8Array, ptr: number): PositionArray {
        let itemsPtr = new DataView(view.buffer, ptr, 4).getUint32(0, true);
        let count = new DataView(view.buffer, ptr + 4, 4).getUint32(0, true);
        let capacity = new DataView(view.buffer, ptr + 8, 4).getUint32(0, true);

        let items: Position[] = [];
        for (let i = 0; i < count; i++) {
            items.push(Position.decode(view, itemsPtr + i * 8));
        }

        return new PositionArray(items, count, capacity);
    }

    encode(view: Uint8Array, ptr: number): void {
        let itemsPtr = ptr + 12;
        for (let i = 0; i < this.count; i++) {
            this.items[i].encode(view, itemsPtr + i * 8);
        }

        new DataView(view.buffer, ptr, 4).setUint32(0, itemsPtr, true);
        new DataView(view.buffer, ptr + 4, 4).setUint32(0, this.count, true);
        new DataView(view.buffer, ptr + 8, 4).setUint32(0, this.capacity, true);
    }

    alloc(allocator: Allocator): number {
        let view = allocator.memory;
        let ptr = allocator.malloc(12 + this.capacity * 8);

        this.encode(view, ptr);

        return ptr;
    }

}

type PathfindFunction = (obstacles: number, width: number, height: number, start: number, end: number, path: number) => number;

let w: WebAssembly.WebAssemblyInstantiatedSource = null;
let allocator: Allocator = null;

const world = "...##..\n.#..#.#\n..#....\n#.##.#.";

WebAssembly.instantiateStreaming(fetch("astar.wasm"), {
    env: {
        memory: new WebAssembly.Memory({ initial: 256, maximum: 256 }),
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

    let [obstacles, width, height] = parseWorld(world);
    let start = new Position(0, 0);
    let end = new Position(width - 1, height - 1);
    let path = new PositionArray([], 0, 0);

    let obstaclesPtr = obstacles.alloc(allocator);
    let startPtr = start.alloc(allocator);
    let endPtr = end.alloc(allocator);
    let pathPtr = path.alloc(allocator);

    let pathfind = w.instance.exports.pathfind as PathfindFunction;
    let result = pathfind(obstaclesPtr, width, height, startPtr, endPtr, pathPtr);

    console.log(result);

    path = PositionArray.decode(allocator.memory, pathPtr);

    for (let i = path.count - 1; i >= 0; i--) {
        console.log(`(${path.items[i].x}, ${path.items[i].y})`);
    }
});
