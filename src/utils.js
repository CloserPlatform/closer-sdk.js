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

export function wrapPromise(promise, fun, args) {
    return new Promise(function(resolve, reject) {
        promise.then(function(obj) {
            if (Array.isArray(obj)) {
                resolve(obj.map((o) => fun.apply(this, [o].concat(args))));
            } else {
                resolve(fun.apply(this, [obj].concat(args)));
            }
        }).catch(reject);
    });
}
