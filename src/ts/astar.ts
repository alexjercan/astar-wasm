import Allocator from "./allocator";

export class Position {
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

export class PositionArray {
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

export type PathfindFunction = (
    obstacles: number,
    width: number,
    height: number,
    start: number,
    end: number,
    path: number
) => number;
