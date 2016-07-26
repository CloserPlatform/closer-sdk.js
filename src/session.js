import { Artichoke } from "./artichoke";

export class Session {
    constructor(config) {
        this.id = config.sessionId;
        this.artichoke = new Artichoke(config);
    }

    get chat() {
        return this.artichoke;
    }
}
