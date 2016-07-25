// Various utilities.

export function nop() {}

export function pathcat() {
    let output = [];
    for (let i = 0; i < arguments.length; i = i + 1) {
        output.push(arguments[i]);
    }
    return output.join("/");
}
