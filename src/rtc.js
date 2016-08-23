import { nop } from "./utils";

// Cross-browser support:
const RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;

export class RTCConnection {
    constructor(config, artichoke) {
        this.artichoke = artichoke;
        this.log = artichoke.log;
        this.log("Connecting an RTC connection.");
        this.conn = new RTCPeerConnection(config);
        this.onRemoteStreamCallback = undefined;
        this._initOnRemoteStream();
    }

    disconnect() {
        this.log("Disconnecting an RTC connection.");
        this.conn.close();
    }

    addStream(stream) {
        this.conn.addStream(stream);
    }

    addCandidate(candidate) {
        this.conn.addIceCandidate(new RTCIceCandidate({
            "candidate": candidate,
            "sdpMid": "",
            "sdpMLineIndex": 0
        }));
    }

    offer(callId, peer) {
        let _this = this;
        this.conn.createOffer(function(offer) {
            _this.conn.setLocalDescription(offer);
            _this._initOnICECandidate(callId, peer);
            _this.artichoke.socket.sendDescription(callId, peer, offer);
        }, function(error) {
            _this.artichoke._error("Could not create an RTC offer.", {
                error
            });
        });
    }

    answer(callId, peer, remoteDescription) {
        this.conn.setRemoteDescription(new RTCSessionDescription(remoteDescription));

        let _this = this;
        this.conn.createAnswer(function(answer) {
            _this.conn.setLocalDescription(answer);
            _this._initOnICECandidate(callId, peer);
            _this.artichoke.socket.sendDescription(callId, peer, answer);
        }, function(error) {
            _this.artichoke._error("Could not create an RTC answer.", {
                error
            });
        });
    }

    onRemoteStream(callback) {
        this.onRemoteStreamCallback = callback;
    }

    _initOnICECandidate(callId, peer) {
        let _this = this;
        this.conn.onicecandidate = function(event) {
            if (event.candidate) {
                _this.log("Created ICE candidate: " + event.candidate.candidate);
                _this.artichoke.socket.sendCandidate(callId, peer, event.candidate.candidate);
            }
        };
    }

    _initOnRemoteStream() {
        let _this = this;
        let onstream = function(event) {
            _this.log("Received a remote stream.");
            _this.onRemoteStreamCallback(event.stream || event.streams[0]);
        };

        if (this.conn.ontrack === null) {
            this.conn.ontrack = onstream;
        } else {
            this.conn.onaddstream = onstream;
        }
    }
}

export class RTCPool {
    constructor(callId, artichoke) {
        this.callId = callId;
        this.artichoke = artichoke;
        this.log = artichoke.log;
        this.config = artichoke.config;
        this.connections = {};

        this.onConnectionCallback = nop;

        let _this = this;
        artichoke.onEvent("rtc_description", function(msg) {
            if (msg.id === callId) {
                _this.log("Received an RTC description: " + msg.description);
                let rtc = _this._create(msg.peer);
                rtc.answer(_this.callId, msg.peer, msg.description);
                _this.onConnectionCallback(msg.peer, rtc);
            }
        });

        artichoke.onEvent("rtc_candidate", function(msg) {
            if (msg.id === callId) {
                _this.log("Received an RTC candidate: " + msg.candidate);
                if (msg.peer in _this.connections) {
                    _this.connections[msg.peer].addCandidate(msg.candidate);
                } else {
                    _this.artichoke._error("Received an invalid RTC candidate.", {
                        error: msg.peer + " is not currently in this call."
                    });
                }
            }
        });
    }

    onConnection(callback) {
        this.onConnectionCallback = callback;
    }

    create(peer) {
        let rtc = this._create(peer);
        rtc.offer(this.callId, peer);
        return rtc;
    }

    _create(peer) {
        if (peer in this.connections) {
            return this.connections[peer];
        }

        let rtc = new RTCConnection(this.config.rtc, this.artichoke);
        this.connections[peer] = rtc;
        return rtc;
    }

    destroy(peer) {
        if (peer in this.connections) {
            this.connections[peer].disconnect();
            delete this.connections[peer];
        }
    }
}
