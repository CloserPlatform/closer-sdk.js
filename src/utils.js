// Various utilities.

export function nop() {}

export function pathcat() {
    let output = [];
    for (let i = 0; i < arguments.length; i++) {
        output.push(arguments[i]);
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
                resolve(obj.map((o) => fun.apply(this, [o].concat(args))));
            } else {
                resolve(fun.apply(this, [obj].concat(args)));
            }
        }).catch(reject);
    });
}
