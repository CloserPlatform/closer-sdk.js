import { Artichoke } from "./artichoke.ts";
import { nop } from "./utils";

export class Session {
    id;
    artichoke;
    constructor(config) {
        this.id = config.sessionId;
        config.log = config.debug ? (line) => console.log("[DEBUG] " + line) : nop;
        this.artichoke = new Artichoke(config);
    }

    get chat() {
        return this.artichoke;
    }
}
