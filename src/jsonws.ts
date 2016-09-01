import { Callback } from "./events";
import { Logger } from "./logger";
import { Event } from "./protocol";

export class JSONWebSocket {
    private log: Logger;
    private url: string;
    private socket: WebSocket;

    constructor(url: string, log: Logger) {
        this.log = log;
        this.url = url;

        this.log("Connecting to: " + this.url);
        this.socket = new WebSocket(url);
        this.socket.onopen = function() {
            log("Connected to: " + url);
        };
    }

    onEvent(callback: Callback<Event>) {
        let _this = this;
        this.socket.onmessage = function(event) {
            _this.log("WS received: " + event.data);
            callback(JSON.parse(event.data) as Event);
        };
    }

    send(event: Event) {
        let json = JSON.stringify(event);
        this.log("WS sent: " + json);
        this.socket.send(json);
    }
}
