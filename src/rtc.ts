import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { RTCCandidate, RTCDescription } from "./protocol/events";
import { ID } from "./protocol/protocol";
import * as wireEvents from "./protocol/wire-events";
import { eventTypes } from "./protocol/wire-events";
import { Thunk } from "./utils";

// FIXME Hackarounds for unstable API.
interface HackedMediaStreamEvent extends MediaStreamEvent {
  streams: Array<MediaStream>;
}

interface HackedRTCPeerConnection extends RTCPeerConnection {
  connectionState: string; // FIXME RTCPeerConnectionState;
  ontrack: (event: HackedMediaStreamEvent) => void;
  addTrack: (track: MediaStreamTrack, stream?: MediaStream) => RTCRtpSender;
  removeTrack: (sender: RTCRtpSender) => void;
}

function supportsTracks(pc: HackedRTCPeerConnection): boolean {
  return (typeof pc.addTrack !== "undefined") && (typeof pc.removeTrack !== "undefined");
}

export type RemovableStream = Array<RTCRtpSender> | MediaStream;

// FIXME Unfuck when Chrome transitions to the Unified Plan.
export class RTCConnection {
  private call: ID;
  private peer: ID;
  private api: ArtichokeAPI;
  private events: EventHandler;
  private log: Logger;
  private conn: RTCPeerConnection;
  private onICEDoneCallback: Thunk;
  private onRemoteStreamCallback: Callback<MediaStream>;

  // FIXME Required by the various hacks:
  private localRole: string;

  constructor(call: ID, peer: ID, config: RTCConfiguration, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    log("Connecting an RTC connection to " + peer + " on " + call);
    this.call = call;
    this.peer = peer;
    this.api = api;
    this.events = events;
    this.log = log;
    this.conn = new RTCPeerConnection(config);

    this.onRemoteStreamCallback = (stream) => {
      // Do nothing.
    };

    this.onICEDoneCallback = () => {
      // Do nothing.
    };

    this.conn.onicecandidate = (event) => {
      if (event.candidate) {
        this.log("Created ICE candidate: " + event.candidate.candidate);
        this.api.sendCandidate(this.call, this.peer, event.candidate);
      } else {
        this.log("Done gathering ICE candidates.");
        this.onICEDoneCallback();
      }
    };

    (this.conn as HackedRTCPeerConnection).ontrack = (event: HackedMediaStreamEvent) => {
      this.log("Received a remote stream.");
      const streams = (typeof event.streams !== "undefined") ? event.streams : [event.stream];
      streams.forEach((stream) => {
        this.onRemoteStreamCallback(stream);
      });
    };

    this.conn.onnegotiationneeded = (event) => {
      // FIXME Chrome triggers renegotiation on... Initial offer creation...
      // FIXME Firefox triggers renegotiation when remote offer is received.
      if (this.isEstablished()) {
        this.log("Renegotiating an RTC connection.");
        this.offer().catch((error) => {
          this.events.raise("Could not renegotiate the connection.", error);
        });
      }
    };
  }

  disconnect() {
    this.log("Disconnecting an RTC connection.");
    this.conn.close();
  }

  addLocalStream(stream: MediaStream): RemovableStream {
    this.log("Removing a local stream.");
    const hackedConn = this.conn as HackedRTCPeerConnection;
    // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
    if (supportsTracks(hackedConn)) {
      return stream.getTracks().map((track) => hackedConn.addTrack(track, stream));
    } else {
      this.conn.addStream(stream);
      return stream;
    }
  }

  removeLocalStream(stream: RemovableStream) {
    this.log("Removing a local stream.");
    const hackedConn = this.conn as HackedRTCPeerConnection;
    // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
    if (supportsTracks(hackedConn)) {
      (stream as Array<RTCRtpSender>).forEach((track) => hackedConn.removeTrack(track));
    } else {
      this.conn.removeStream(stream as MediaStream);
    }
  }

  addCandidate(candidate: wireEvents.Candidate): Promise<void> {
    this.log("Received an RTC candidate: " + candidate.candidate);
    return this.conn.addIceCandidate(new RTCIceCandidate(candidate));
  }

  offer(): Promise<wireEvents.SDP> {
    this.log("Creating an RTC offer.");

    return this.conn.createOffer().then((offer) => {
      return this.setLocalDescription(offer);
    }).then((offer) => {
      this.api.sendDescription(this.call, this.peer, offer);
      this.log("Sent an RTC offer: " + offer.sdp);
      return offer;
    });
  }

  addOffer(remoteDescription: wireEvents.SDP): Promise<wireEvents.SDP> {
    this.log("Received an RTC offer.");

    return this.setRemoteDescription(remoteDescription).then((descr) => this.answer());
  }

  answer(): Promise<wireEvents.SDP> {
    this.log("Creating an RTC answer.");

    return this.conn.createAnswer().then((answer) => {
      // FIXME Chrome does not support DTLS role changes.
      return this.setLocalDescription(this.patchSDP(answer));
    }).then((answer) => {
      this.api.sendDescription(this.call, this.peer, answer);
      this.log("Sent an RTC description: " + answer.sdp);
      return answer;
    });
  }

  addAnswer(remoteDescription: wireEvents.SDP): Promise<void> {
    this.log("Received an RTC answer.");
    return this.setRemoteDescription(remoteDescription).then((descr) => {
      // FIXME Chrome does not support DTLS role changes.
      this.extractRole(descr);
    });
  }

  onRemoteStream(callback: Callback<MediaStream>) {
    this.onRemoteStreamCallback = callback;
  }

  // FIXME This is only used by tests...
  onICEDone(callback: Thunk) {
    this.onICEDoneCallback = callback;
  }

  // FIXME This should be private.
  setRemoteDescription(remoteDescription: wireEvents.SDP): Promise<wireEvents.SDP> {
    this.log("Setting remote RTC description.");
    return this.conn.setRemoteDescription(new RTCSessionDescription(remoteDescription)).then(() => remoteDescription);
  }

  private setLocalDescription(localDescription: wireEvents.SDP): Promise<wireEvents.SDP> {
    this.log("Setting local RTC description.");
    return this.conn.setLocalDescription(new RTCSessionDescription(localDescription)).then(() => localDescription);
  }

  private isEstablished(): boolean {
    // NOTE "stable" means no exchange is going on, which encompases "fresh"
    // NOTE RTC connections as well as established ones.
    const hackedConn = this.conn as HackedRTCPeerConnection;
    if (typeof hackedConn.connectionState !== "undefined") {
      return hackedConn.connectionState === "connected";
    } else {
      // FIXME Firefox does not support connectionState: https://bugzilla.mozilla.org/show_bug.cgi?id=1265827
      return this.conn.signalingState === "stable" &&
        (this.conn.iceConnectionState === "connected" || this.conn.iceConnectionState === "completed");
    }
  }

  private getRole(descr: wireEvents.SDP): string {
    return /a=setup:([^\r\n]+)/.exec(descr.sdp)[1];
  }

  private updateRole(descr: wireEvents.SDP, role: string): wireEvents.SDP {
    const hackedDescr = descr;
    hackedDescr.sdp = hackedDescr.sdp.replace(/a=setup:[^\r\n]+/, "a=setup:" + role);
    return hackedDescr;
  }

  private extractRole(descr: wireEvents.SDP) {
    if (this.localRole === undefined) {
      this.localRole = (this.getRole(descr) === "active") ? "passive" : "active";
    }
  }

  private patchSDP(descr: wireEvents.SDP): wireEvents.SDP {
    if (this.localRole !== undefined) {
      return this.updateRole(descr, this.localRole);
    } else {
      this.localRole = this.getRole(descr);
      return descr;
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

  private call: ID;
  private localStream: MediaStream;
  private config: RTCConfiguration;
  private connections: { [user: string]: RTCConnection };
  private streams: { [user: string]: RemovableStream };
  private onConnectionCallback: ConnectionCallback;

  constructor(call: ID, config: RTCConfiguration, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.api = api;
    this.events = events;
    this.log = log;

    this.call = call;
    this.config = config;

    this.connections = {};
    this.streams = {};
    this.localStream = undefined;
    this.onConnectionCallback = (peer, conn) => {
      // Do Nothing.
    };

    events.onConcreteEvent(eventTypes.RTC_DESCRIPTION, this.call, (msg: RTCDescription) => {
      this.log("Received an RTC description: " + msg.description.sdp);

      if (msg.description.type === "offer") {
        if (msg.peer in this.connections) {
          this.connections[msg.peer].addOffer(msg.description).catch((error) => {
            events.raise("Could not process the RTC description: ", error);
          });
        } else {
          const rtc = this.createRTC(msg.peer);
          this.onConnectionCallback(msg.peer, rtc);
          rtc.addOffer(msg.description).catch((error) => {
            events.raise("Could not process the RTC description: ", error);
          });
        }
      } else if (msg.description.type === "answer") {
        if (msg.peer in this.connections) {
          this.connections[msg.peer].addAnswer(msg.description).catch((error) => {
            events.raise("Could not process the RTC description: ", error);
          });
        } else {
          events.raise("Received an invalid RTC answer from " + msg.peer);
        }
      } else {
        events.raise("Received an invalid RTC description type " + msg.description.type);
      }
    });

    events.onConcreteEvent(eventTypes.RTC_CANDIDATE, this.call, (msg: RTCCandidate) => {
      this.log("Received an RTC candidate: " + msg.candidate);
      if (msg.peer in this.connections) {
        this.connections[msg.peer].addCandidate(msg.candidate).catch((error) => {
          events.raise("Could not process the RTC candidate: ", error);
        });
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
    Object.keys(this.connections).forEach((peer) => {
      this.updateConnectionStream(peer, stream);
    });
  }

  removeLocalStream() {
    this.localStream = undefined;
    Object.keys(this.streams).forEach((peer) => {
      this.connections[peer].removeLocalStream(this.streams[peer]);
      delete this.streams[peer];
    });
  }

  create(peer: ID): RTCConnection {
    const rtc = this.createRTC(peer);
    rtc.offer().catch((error) => {
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
      this.api.updateStream(this.call, "mute");
    }
  }

  unmuteStream() {
    if (this.localStream && this.localStream.getAudioTracks().some((t) => !t.enabled)) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
      this.api.updateStream(this.call, "unmute");
    }
  }

  pauseStream() {
    if (this.localStream && this.localStream.getVideoTracks().some((t) => t.enabled)) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = false;
      });
      this.api.updateStream(this.call, "pause");
    }
  }

  unpauseStream() {
    if (this.localStream && this.localStream.getVideoTracks().some((t) => !t.enabled)) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = true;
      });
      this.api.updateStream(this.call, "unpause");
    }
  }

  private updateConnectionStream(peer: string, stream: MediaStream) {
    this.streams[peer] = this.connections[peer].addLocalStream(stream);
  }

  private createRTC(peer: ID): RTCConnection {
    const rtc = createRTCConnection(this.call, peer, this.config, this.log, this.events, this.api);
    this.connections[peer] = rtc;
    this.updateConnectionStream(peer, this.localStream);
    return rtc;
  }
}

export function createRTCConnection(call: ID, peer: ID, config: RTCConfiguration, log: Logger,
                                    events: EventHandler, api: ArtichokeAPI): RTCConnection {
  return new RTCConnection(call, peer, config, log, events, api);
}

export function createRTCPool(call: ID, config: RTCConfiguration, log: Logger,
                              events: EventHandler, api: ArtichokeAPI): RTCPool {
  return new RTCPool(call, config, log, events, api);
}
