import { ArtichokeAPI } from "./api";
import { EventHandler } from "./events";
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

export interface RemoteStreamCallback {
  (stream: MediaStream): void;
}

export class RTCConnection {
  private call: ID;
  private peer: ID;
  private api: ArtichokeAPI;
  private log: Logger;
  private conn: RTCPeerConnection;
  private onRemoteStreamCallback: RemoteStreamCallback;

  constructor(call: ID, peer: ID, config: RTCConfiguration, log: Logger, api: ArtichokeAPI) {
    log("Connecting an RTC connection to " + peer + " on " + call);
    this.call = call;
    this.peer = peer;
    this.api = api;
    this.log = log;
    this.conn = new RTCPeerConnection(config);

    this.onRemoteStreamCallback = (stream) => {
      // Do nothing.
    };

    (this.conn as HackedRTCPeerConnection).ontrack = (event: HackedMediaStreamEvent) => {
      this.log("Received a remote stream.");
      const streams = (typeof event.streams !== "undefined") ? event.streams : [event.stream];
      streams.forEach((stream) => {
        this.onRemoteStreamCallback(stream);
      });
    };

    this.conn.onicecandidate = (event) => {
      if (event.candidate) {
        this.log("Created ICE candidate: " + event.candidate.candidate);
        this.api.sendCandidate(this.call, this.peer, event.candidate);
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

  addCandidate(candidate: wireEvents.Candidate) {
    this.conn.addIceCandidate(new RTCIceCandidate(candidate));
  }

  renegotiate(): Promise<wireEvents.SDP> {
    this.conn.onicecandidate = (event) => {
      // FIXME Chrome requires not propagating ICE during renegotiation.
      // Do nothing.
    };
    return this.offer();
  }

  offer(): Promise<wireEvents.SDP> {
    this.log("Creating RTC offer.");

    return new Promise((resolve, reject) => {
      this.conn.createOffer((offer) => {
        this.conn.setLocalDescription(offer);
        this.api.sendDescription(this.call, this.peer, offer as wireEvents.SDP);
        resolve(offer);
      }, reject);
    });
  }

  answer(remoteDescription: wireEvents.SDP): Promise<wireEvents.SDP> {
    this.log("Creating RTC answer.");
    this.setRemoteDescription(remoteDescription);

    return new Promise((resolve, reject) => {
      this.conn.createAnswer((answer) => {
        this.conn.setLocalDescription(answer);
        this.api.sendDescription(this.call, this.peer, answer as wireEvents.SDP);
        resolve(answer);
      }, reject);
    });
  }

  onRemoteStream(callback: RemoteStreamCallback) {
    this.onRemoteStreamCallback = callback;
  }

  setRemoteDescription(remoteDescription: wireEvents.SDP) {
    this.conn.setRemoteDescription(new RTCSessionDescription(remoteDescription));
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
          this.sendAnswer(this.connections[msg.peer], msg.description);
        } else {
          let rtc = this.createRTC(msg.peer);
          this.sendAnswer(rtc, msg.description);
          this.onConnectionCallback(msg.peer, rtc);
        }
      } else if (msg.description.type === "answer") {
        if (msg.peer in this.connections) {
          this.connections[msg.peer].setRemoteDescription(msg.description);
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
    Object.keys(this.connections).forEach((key) => {
      this.connections[key].addLocalStream(stream);
      this.resendOffer(this.connections[key]); // FIXME Move this to RCTConnection.onNegotiationNeeded
    });
  }

  create(peer: ID): RTCConnection {
    let rtc = this.createRTC(peer);
    this.sendOffer(rtc);
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
    let rtc = createRTCConnection(this.call, peer, this.config, this.log, this.api);
    rtc.addLocalStream(this.localStream);
    this.connections[peer] = rtc;
    return rtc;
  }

  private sendAnswer(rtc: RTCConnection, remoteDescription: wireEvents.SDP) {
    rtc.answer(remoteDescription).then((answer) => {
      this.log("Sent an RTC description: " + answer.sdp);
    }).catch((error) => {
      this.events.raise("Could not create an RTC answer.", error);
    });
  }

  private sendOffer(rtc: RTCConnection) {
    this.handleOffer(rtc.offer());
  }

  private resendOffer(rtc: RTCConnection) {
    this.handleOffer(rtc.renegotiate());
  }

  private handleOffer(promise: Promise<wireEvents.SDP>) {
    promise.then((offer) => {
      this.log("Sent an RTC description: " + offer.sdp);
    }).catch((error) => {
      this.events.raise("Could not create an RTC offer.", error);
    });
  }
}

export function createRTCConnection(call: ID, peer: ID, config: RTCConfiguration,
                                    log: Logger, api: ArtichokeAPI): RTCConnection {
  return new RTCConnection(call, peer, config, log, api);
}

export function createRTCPool(call: ID, config: RTCConfiguration, log: Logger,
                              events: EventHandler, api: ArtichokeAPI): RTCPool {
  return new RTCPool(call, config, log, events, api);
}
