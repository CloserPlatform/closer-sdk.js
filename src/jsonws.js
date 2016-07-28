// FIXME Get rid of any business logic from here.
function fixCall(m) {
    if (m.type === "call") {
        let fixed = {
            "type": "call_" + m.signal,
            "sender": m.sender
        };
        switch (m.signal) {
        case "answer": fixed.sdp = m.body; break;
        case "offer": fixed.sdp = m.body; break;
        case "candidate": fixed.candidate = m.body; break;
        case "hangup": fixed.reason = m.body; break;
        default: break;
        }
        return fixed;
    } else {
        return m;
    }
}

export class JSONWebSocket {
    constructor(url, config) {
        this.log = config.log;
        this.url = url;

        this.log("Connecting to: " + this.url);
        this.socket = new WebSocket(url);
    }

    onConnect(callback) {
        let _this = this;
        this.socket.onopen = function() {
            _this.log("Connected to: " + _this.url);
            callback();
        };
    }

    onMessage(callback) {
        let _this = this;
        this.socket.onmessage = function(event) {
            _this.log("WS received: " + event.data);
            callback(fixCall(JSON.parse(event.data))); // FIXME Don't fix anything.
        };
    }

    send(obj) {
        let json = JSON.stringify(obj);
        this.log("WS sent: " + json);
        this.socket.send(json);
    }
}
