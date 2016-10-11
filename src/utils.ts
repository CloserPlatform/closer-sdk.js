// Various utilities.

export interface TransferFunction<T, U> {
    (arg: T): U;
}

export function wrapPromise<T, U>(promise: Promise<T | Array<T>>, fun: TransferFunction<T, U>): Promise<U | Array<U>> {
    return new Promise<U | Array<U>>(function(resolve, reject) {
        promise.then(function(obj) {
            if (Array.isArray(obj)) {
                resolve((obj as Array<T>).map(fun));
            } else {
                resolve(fun(obj as T));
            }
        }).catch(reject);
    });
}
