#ifndef ASTAR_H
#define ASTAR_H

void *astar_malloc(unsigned int sz);
void *astar_realloc(void *ptr, unsigned int old_sz, unsigned int new_sz);
void astar_free(void *ptr);
void astar_exit(int code);

struct position {
        int x; // 4 bytes
        int y; // 4 bytes
};

struct position_array {
        struct position *items; // 4 bytes
        int count;              // 4 bytes
        int capacity;           // 4 bytes
};

int pathfind(struct position_array *obstacles, int width, int height,
             struct position start, struct position end,
             struct position_array *p);

#endif // ASTAR_H
