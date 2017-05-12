import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { RTCCandidate, RTCDescription } from "./protocol/events";
import { ID } from "./protocol/protocol";
import * as wireEvents from "./protocol/wire-events";
import { eventTypes } from "./protocol/wire-events";

// FIXME Hackarounds for unstable API.
interface HackedMediaStreamEvent extends MediaStreamEvent {
  streams: Array<MediaStream>;
}

interface HackedRTCPeerConnection extends RTCPeerConnection {
  ontrack: (event: HackedMediaStreamEvent) => void;
  addTrack: (track: MediaStreamTrack, stream?: MediaStream) => void;
}

export class RTCConnection {
  private call: ID;
  private peer: ID;
  private api: ArtichokeAPI;
  private events: EventHandler;
  private log: Logger;
  private conn: RTCPeerConnection;
  private onRemoteStreamCallback: Callback<MediaStream>;

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

    this.conn.onicecandidate = (event) => {
      if (event.candidate) {
        this.log("Created ICE candidate: " + event.candidate.candidate);
        this.api.sendCandidate(this.call, this.peer, event.candidate);
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

  addLocalStream(stream: MediaStream) {
    const hackedConn = this.conn as HackedRTCPeerConnection;
    // FIXME Needs https://github.com/webrtc/adapter/pull/503
    if (hackedConn.addTrack !== undefined) {
      stream.getTracks().forEach((track) => (this.conn as HackedRTCPeerConnection).addTrack(track, stream));
    } else {
      this.conn.addStream(stream);
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
      return this.setLocalDescription(answer);
    }).then((answer) => {
      this.api.sendDescription(this.call, this.peer, answer);
      this.log("Sent an RTC description: " + answer.sdp);
      return answer;
    });
  }

  addAnswer(remoteDescription: wireEvents.SDP): Promise<void> {
    this.log("Received an RTC answer.");
    return this.setRemoteDescription(remoteDescription).then((descr) => {
      // Do nothing.
    });
  }

  onRemoteStream(callback: Callback<MediaStream>) {
    this.onRemoteStreamCallback = callback;
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
    // NOTE "stable" means no exchange is going on, which encompases "fresh" RTC connections as well as established ones.
    return (this.conn.signalingState === "stable") && !!this.conn.localDescription && !!this.conn.remoteDescription;
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
  private onConnectionCallback: ConnectionCallback;

  constructor(call: ID, config: RTCConfiguration, log: Logger, events: EventHandler, api: ArtichokeAPI) {
    this.api = api;
    this.events = events;
    this.log = log;

    this.call = call;
    this.config = config;

    this.connections = {};
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
          let rtc = this.createRTC(msg.peer);
          rtc.addOffer(msg.description).then((answer) => {
            this.onConnectionCallback(msg.peer, rtc);
          }).catch((error) => {
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
    Object.keys(this.connections).forEach((key) => {
      this.connections[key].addLocalStream(stream);
    });
  }

  create(peer: ID): RTCConnection {
    let rtc = this.createRTC(peer);
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

  private createRTC(peer: ID): RTCConnection {
    let rtc = createRTCConnection(this.call, peer, this.config, this.log, this.events, this.api);
    rtc.addLocalStream(this.localStream);
    this.connections[peer] = rtc;
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
