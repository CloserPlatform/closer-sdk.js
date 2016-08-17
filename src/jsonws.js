export class JSONWebSocket {
    constructor(url, config) {
        this.log = config.log;
        this.url = url;

        this.log("Connecting to: " + this.url);
        this.socket = new WebSocket(url);
        this.socket.onopen = function() {
            config.log("Connected to: " + url);
        };
    }

    onMessage(callback) {
        let _this = this;
        this.socket.onmessage = function(event) {
            _this.log("WS received: " + event.data);
            callback(JSON.parse(event.data));
        };
    }

    send(obj) {
        let json = JSON.stringify(obj);
        this.log("WS sent: " + json);
        this.socket.send(json);
    }
}
