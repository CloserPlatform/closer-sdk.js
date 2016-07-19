// Various utilities.

export function nop() {}

export function pathcat() {
    let output = [];
    for(let i in arguments) output.push(arguments[i]);
    return output.join("/");
}

