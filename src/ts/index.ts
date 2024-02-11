let w: WebAssembly.WebAssemblyInstantiatedSource = null;

WebAssembly.instantiateStreaming(fetch("astar.wasm"), {
    env: {
        memory: new WebAssembly.Memory({ initial: 256, maximum: 256 }),
    },
}).then((value) => {
    w = value;
});
