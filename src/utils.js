// Various utilities.

export function nop() {}

export function pathcat() {
    let output = [];
    for (let i = 0; i < arguments.length; i = i + 1) {
        output.push(arguments[i]);
    }
    return output.join("/");
}

export function merge(cfg, defaultCfg) {
    let config = cfg;
    Object.getOwnPropertyNames(defaultCfg).forEach((p) => {
        config[p] = cfg[p] || defaultCfg[p];
    });
    return config;
}
