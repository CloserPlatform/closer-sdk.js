import { Artichoke } from "./artichoke";
import { nop } from "./utils";

export class Session {
    constructor(config) {
        this.id = config.sessionId;
        config.log = config.debug ? (line) => console.log("[DEBUG] " + line) : nop;
        this.artichoke = new Artichoke(config);
    }

    get chat() {
        return this.artichoke;
    }
}
