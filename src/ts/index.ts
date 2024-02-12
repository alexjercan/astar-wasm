import Allocator from "./allocator";
import { PathfindFunction } from "./astar";
import World from "./world";

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
        },
    },
}).then((value) => {
    w = value;
    allocator = new Allocator(
        new Uint8Array(
            (w.instance.exports.memory as WebAssembly.Memory).buffer
        ),
        (w.instance.exports.__heap_base as WebAssembly.Global).value
    );

    let pathfind = w.instance.exports.pathfind as PathfindFunction;
    let world = new World(allocator, pathfind, 10, 10, 50);

    world.renderWorld();
});
