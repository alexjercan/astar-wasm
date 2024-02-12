export default class Allocator {
    memory: Uint8Array;
    offset: number;
    base: number;

    constructor(memory: Uint8Array, offset: number) {
        this.memory = memory;
        this.offset = offset;
        this.base = offset;
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

    reset(): void {
        for (let i = this.base; i < this.offset; i++) {
            this.memory[i] = 0;
        }
        this.offset = this.base;
    }
}
