// Various utilities.

export function nop() {
    // NOTE Don't do anything.
}

export function pathcat(parts) {
    let output = [];
    for (let i = 0; i < parts.length; i++) {
        output.push(parts[i]);
    }
    return output.join("/");
}

export function merge(a, b) {
    b = b || {};

    let result = a;
    Object.getOwnPropertyNames(b).forEach((p) => {
        result[p] = a[p] || b[p];
    });
    return result;
}

export function wrapPromise(promise, fun, args) {
    return new Promise(function(resolve, reject) {
        promise.then(function(obj) {
            if (Array.isArray(obj)) {
                resolve(obj.map((o) => fun.apply(fun, [o].concat(args))));
            } else {
                resolve(fun.apply(fun, [obj].concat(args)));
            }
        }).catch(reject);
    });
}
