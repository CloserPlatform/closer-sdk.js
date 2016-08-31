import { Artichoke } from "./artichoke";
import { EventHandler } from "./events";
import { Logger } from "./logger";
import { Candidate, ID, RTCCandidate, RTCDescription, SDP } from "./protocol";

// Cross-browser support:
function newRTCPeerConnection(config: RTCConfiguration): RTCPeerConnection {
    if (typeof RTCPeerConnection !== "undefined") {
        return new RTCPeerConnection(config);
    } else if (typeof webkitRTCPeerConnection !== "undefined") {
        return new webkitRTCPeerConnection(config);
    } else if (typeof mozRTCPeerConnection !== "undefined") {
        return new mozRTCPeerConnection(config);
    } else {
        // FIXME Add support for more browsers.
        throw Error("Browser not supported!");
    };
}

interface RTCPeerConnectionWithOnTrack extends RTCPeerConnection {
    ontrack?: (event: RTCMediaStreamEvent) => void; // NOTE Hackaround for unstable API.
}

export interface RemoteStreamCallback {
    (stream: MediaStream): void;
}

export class RTCConnection {
    private artichoke: Artichoke;
    private log: Logger;
    private conn: RTCPeerConnection;
    private onRemoteStreamCallback: RemoteStreamCallback;

    constructor(stream: MediaStream, config: RTCConfiguration, artichoke: Artichoke) {
        this.artichoke = artichoke;
        this.log = artichoke.log;
        this.log("Connecting an RTC connection.");
        this.conn = newRTCPeerConnection(config);
        this.conn.addStream(stream);
        this.initOnRemoteStream();
    }

    disconnect() {
        this.log("Disconnecting an RTC connection.");
        this.conn.close();
    }

    addCandidate(candidate: Candidate) {
        this.conn.addIceCandidate(new RTCIceCandidate({
            "candidate": candidate,
            "sdpMid": "",
            "sdpMLineIndex": 0
        }));
    }

    offer(callId: ID, peer: ID) {
        this.log("Creating RTC offer.");

        let _this = this;
        this.conn.createOffer(function(offer) {
            _this.conn.setLocalDescription(offer);
            _this.initOnICECandidate(callId, peer);
            _this.artichoke.socket.sendDescription(callId, peer, offer);
        }, function(error) {
            _this.artichoke._error("Could not create an RTC offer.", {
                error
            });
        });
    }

    answer(callId: ID, peer: ID, remoteDescription: SDP) {
        this.log("Creating RTC answer.");
        this.setRemoteDescription(remoteDescription);

        let _this = this;
        this.conn.createAnswer(function(answer) {
            _this.conn.setLocalDescription(answer);
            _this.initOnICECandidate(callId, peer);
            _this.artichoke.socket.sendDescription(callId, peer, answer);
        }, function(error) {
            _this.artichoke._error("Could not create an RTC answer.", {
                error
            });
        });
    }

    onRemoteStream(callback: RemoteStreamCallback) {
        this.onRemoteStreamCallback = callback;
    }

    setRemoteDescription(remoteDescription: SDP) {
        this.conn.setRemoteDescription(new RTCSessionDescription(remoteDescription));
    }

    private initOnICECandidate(callId: ID, peer: ID) {
        let _this = this;
        this.conn.onicecandidate = function(event) {
            if (event.candidate) {
                _this.log("Created ICE candidate: " + event.candidate.candidate);
                _this.artichoke.socket.sendCandidate(callId, peer, event.candidate.candidate);
            }
        };
    }

    private initOnRemoteStream() {
        let _this = this;
        let onstream = function(event) {
            _this.log("Received a remote stream.");
            _this.onRemoteStreamCallback(event.stream || event.streams[0]);
        };

        let hackedConn = (this.conn as RTCPeerConnectionWithOnTrack);
        if (typeof hackedConn.ontrack !== "undefined") {
            hackedConn.ontrack = onstream;
        } else {
            this.conn.onaddstream = onstream;
        }
    }
}

export interface ConnectionCallback {
    (peer: ID, connection: RTCConnection): void;
}

export class RTCPool {
    private artichoke: Artichoke;
    private log: Logger;

    private callId: ID;
    private localStream: MediaStream;
    private config: RTCConfiguration;
    private connections: { [user: string]: RTCConnection };
    private onConnectionCallback: ConnectionCallback;

    constructor(callId: ID, events: EventHandler, artichoke: Artichoke) {
        this.artichoke = artichoke;
        this.log = artichoke.log;

        this.callId = callId;
        this.config = artichoke.config.rtc;
        this.connections = {};
        this.localStream = undefined;
        this.onConnectionCallback = (peer, conn) => {
            // Do Nothing.
        };

        let _this = this;
        events.onConcreteEvent("rtc_description", callId, function(msg: RTCDescription) {
            _this.log("Received an RTC description: " + msg.description.sdp);
            if (msg.peer in _this.connections) {
                _this.connections[msg.peer].setRemoteDescription(msg.description);
            } else {
                let rtc = _this._create(msg.peer);
                rtc.answer(_this.callId, msg.peer, msg.description);
                _this.onConnectionCallback(msg.peer, rtc);
            }
        });

        events.onConcreteEvent("rtc_candidate", callId, function(msg: RTCCandidate) {
            _this.log("Received an RTC candidate: " + msg.candidate);
            if (msg.peer in _this.connections) {
                _this.connections[msg.peer].addCandidate(msg.candidate);
            } else {
                _this.artichoke._error("Received an invalid RTC candidate.", {
                    error: msg.peer + " is not currently in this call."
                });
            }
        });
    }

    onConnection(callback: ConnectionCallback) {
        this.onConnectionCallback = callback;
    }

    addLocalStream(stream: MediaStream) {
        this.localStream = stream;
    }

    create(peer: ID): RTCConnection {
        let rtc = this._create(peer);
        rtc.offer(this.callId, peer);
        return rtc;
    }

    _create(peer: ID): RTCConnection {
        let rtc = new RTCConnection(this.localStream, this.config, this.artichoke);
        this.connections[peer] = rtc;
        return rtc;
    }

    destroy(peer: ID) {
        if (peer in this.connections) {
            this.connections[peer].disconnect();
            delete this.connections[peer];
        }
    }

    destroyAll() {
        let _this = this;
        Object.keys(this.connections).forEach((key) => _this.destroy(key));
    }
}
