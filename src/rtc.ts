import { ArtichokeAPI } from "./api";
import { EventHandler } from "./events";
import { Logger } from "./logger";
import { Candidate, ID, RTCCandidate, RTCDescription, SDP } from "./protocol";

// Cross-browser support:
function newRTCPeerConnection(config: RTCConfiguration): RTCPeerConnection {
  if (typeof RTCPeerConnection !== "undefined") {
    return new RTCPeerConnection(config);
  } else {
    // FIXME Add support for more browsers.
    throw Error("Browser not supported!");
  };
}

interface RTCPeerConnectionWithOnTrack extends RTCPeerConnection {
  ontrack?: (event: MediaStreamEvent) => void; // NOTE Hackaround for unstable API.
}

export interface RemoteStreamCallback {
  (stream: MediaStream): void;
}

export class RTCConnection {
  private api: ArtichokeAPI;
  private log: Logger;
  private conn: RTCPeerConnection;
  private onRemoteStreamCallback: RemoteStreamCallback;

  constructor(stream: MediaStream, config: RTCConfiguration, log: Logger, api: ArtichokeAPI) {
    log("Connecting an RTC connection.");
    this.api = api;
    this.log = log;
    this.conn = newRTCPeerConnection(config);
    this.conn.addStream(stream);
    this.initOnRemoteStream();
  }

  disconnect() {
    this.log("Disconnecting an RTC connection.");
    this.conn.close();
  }

  addCandidate(candidate: Candidate) {
    this.conn.addIceCandidate(new RTCIceCandidate(candidate));
  }

  offer(callId: ID, peer: ID): Promise<SDP> {
    this.log("Creating RTC offer.");

    return new Promise((resolve, reject) => {
      this.conn.createOffer((offer) => {
        this.conn.setLocalDescription(offer);
        this.initOnICECandidate(callId, peer);
        this.api.sendDescription(callId, peer, offer as SDP);
        resolve(offer);
      }, reject);
    });
  }

  answer(callId: ID, peer: ID, remoteDescription: SDP): Promise<SDP> {
    this.log("Creating RTC answer.");
    this.setRemoteDescription(remoteDescription);

    return new Promise((resolve, reject) => {
      this.conn.createAnswer((answer) => {
        this.conn.setLocalDescription(answer);
        this.initOnICECandidate(callId, peer);
        this.api.sendDescription(callId, peer, answer as SDP);
        resolve(answer);
      }, reject);
    });
  }

  onRemoteStream(callback: RemoteStreamCallback) {
    this.onRemoteStreamCallback = callback;
  }

  setRemoteDescription(remoteDescription: SDP) {
    this.conn.setRemoteDescription(new RTCSessionDescription(remoteDescription));
  }

  private initOnICECandidate(callId: ID, peer: ID) {
    this.conn.onicecandidate = (event) => {
      if (event.candidate) {
        this.log("Created ICE candidate: " + event.candidate.candidate);
        this.api.sendCandidate(callId, peer, event.candidate);
      }
    };
  }

  private initOnRemoteStream() {
    let onstream = (event) => {
      this.log("Received a remote stream.");
      this.onRemoteStreamCallback(event.stream || event.streams[0]);
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
  private api: ArtichokeAPI;
  private events: EventHandler;
  private log: Logger;

  private callId: ID;
  private localStream: MediaStream;
  private config: RTCConfiguration;
  private connections: { [user: string]: RTCConnection };
  private onConnectionCallback: ConnectionCallback;

  constructor(callId: ID, config: RTCConfiguration, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.api = api;
    this.events = events;
    this.log = log;

    this.callId = callId;
    this.config = config;

    this.connections = {};
    this.localStream = undefined;
    this.onConnectionCallback = (peer, conn) => {
      // Do Nothing.
    };

    events.onConcreteEvent("rtc_description", callId, (msg: RTCDescription) => {
      this.log("Received an RTC description: " + msg.description.sdp);
      if (msg.peer in this.connections) {
        this.connections[msg.peer].setRemoteDescription(msg.description);
      } else {
        let rtc = this.createRTC(msg.peer);
        rtc.answer(this.callId, msg.peer, msg.description).then((answer) => {
          this.log("Sent an RTC description: " + answer.sdp);
        }).catch(function(error) {
          events.raise("Could not create an RTC answer.", error);
        });
        this.onConnectionCallback(msg.peer, rtc);
      }
    });

    events.onConcreteEvent("rtc_candidate", callId, (msg: RTCCandidate) => {
      this.log("Received an RTC candidate: " + msg.candidate);
      if (msg.peer in this.connections) {
        this.connections[msg.peer].addCandidate(msg.candidate);
      } else {
        events.raise("Received an invalid RTC candidate. " +  msg.peer + " is not currently in this call.");
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
    let rtc = this.createRTC(peer);
    rtc.offer(this.callId, peer).then((offer) => {
      this.log("Sent an RTC description: " + offer.sdp);
    }).catch(function(error) {
      this.events.raise("Could not create an RTC offer.", error);
    });
    return rtc;
  }

  destroy(peer: ID) {
    if (peer in this.connections) {
      this.connections[peer].disconnect();
      delete this.connections[peer];
    }
  }

  destroyAll() {
    Object.keys(this.connections).forEach((key) => this.destroy(key));
  }

  muteStream() {
    if (this.localStream && this.localStream.getAudioTracks().some((t) => t.enabled)) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = false;
      });
      this.api.updateStream(this.callId, "mute");
    }
  }

  unmuteStream() {
    if (this.localStream && this.localStream.getAudioTracks().some((t) => !t.enabled)) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      this.api.updateStream(this.callId, "unmute");
    }
  }

  pauseStream() {
    if (this.localStream && this.localStream.getVideoTracks().some((t) => t.enabled)) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = false;
      });
      this.api.updateStream(this.callId, "pause");
    }
  }

  unpauseStream() {
    if (this.localStream && this.localStream.getVideoTracks().some((t) => !t.enabled)) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = true;
      });
      this.api.updateStream(this.callId, "unpause");
    }
  }

  private createRTC(peer: ID): RTCConnection {
    let rtc = createRTCConnection(this.localStream, this.config, this.log, this.api);
    this.connections[peer] = rtc;
    return rtc;
  }
}

export function createRTCConnection(stream: MediaStream, config: RTCConfiguration,
                                    log: Logger, api: ArtichokeAPI): RTCConnection {
  return new RTCConnection(stream, config, log, api);
}

export function createRTCPool(callId: ID, config: RTCConfiguration, log: Logger,
                              events: EventHandler, api: ArtichokeAPI): RTCPool {
  return new RTCPool(callId, config, log, events, api);
}
