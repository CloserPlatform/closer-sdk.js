// Cross-browser support:
const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

export class RTCConnection {
    constructor(config) {
        this.log = config.log;
        this.config = config.rtc;

        this.conn = undefined;

        this._connect();
    }

    addStream(stream) {
        this.conn.addStream(stream);
    }

    addICECandidate(candidate) {
        this.conn.addIceCandidate(new RTCIceCandidate({
            "candidate": candidate,
            "sdpMid": "",
            "sdpMLineIndex": 0
        }));
    }

    setRemoteDescription(type, sdp, onIceCandidate) {
        this.conn.setRemoteDescription(new RTCSessionDescription({
            "type": type,
            "sdp": sdp
        }));

        let _this = this;
        this.conn.onicecandidate = function(event) {
            if (event.candidate) {
                _this.log("Created ICE candidate: " + event.candidate);
                onIceCandidate(event.candidate.candidate);
            }
        };
    }

    createOffer() {
        let _this = this;
        return new Promise(function(resolve, reject) {
            _this.conn.createOffer(function(offer) {
                _this.conn.setLocalDescription(offer);
                resolve(offer.sdp);
            }, reject);
        });
    }

    createAnswer() {
        let _this = this;
        return new Promise(function(resolve, reject) {
            _this.conn.createAnswer(function(answer) {
                _this.conn.setLocalDescription(answer);
                resolve(answer.sdp);
            }, reject);
        });
    }

    onRemoteStream(callback) {
        this.onRemoteStreamCallback = callback;
    }

    disconnect() {
        this.log("Disconnecting a RTC connection.");
        this.conn.close();
    }

    _connect() {
        this.log("Connecting a RTC connection.");
        this.conn = new RTCPeerConnection(this.config);

        let _this = this;
        let onstream = function(event) {
            _this.log("Received remote stream.");
            _this.onRemoteStreamCallback(event.stream || event.streams[0]);
        };

        if (this.conn.ontrack === null) {
            this.conn.ontrack = onstream;
        } else {
            this.conn.onaddstream = onstream;
        }
    }
}
