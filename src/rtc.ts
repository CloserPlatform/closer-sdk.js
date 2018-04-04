import { ArtichokeAPI } from "./api";
import { Callback, EventHandler } from "./events";
import { Logger } from "./logger";
import { RTCCandidate, RTCDescription } from "./protocol/events";
import { ID } from "./protocol/protocol";
import * as wireEvents from "./protocol/wire-events";
import { error, Event, eventTypes } from "./protocol/wire-events";
import { onceDelayed, randomUUID, Thunk, UUID } from "./utils";

export interface RTCConnectionConstraints {
  // FIXME @types/webrtc currently does not have this interface defined.
}

export interface RTCAnswerOptions {
  // FIXME @types/webrtc currently does not have this interface defined.
}

export interface HackedRTCOfferOptions {
  // FIXME @types/webrtc defines this interface to use numbers instead of booleans.
  offerToReceiveAudio: boolean;
  offerToReceiveVideo: boolean;
}

// FIXME Hackarounds for unstable API.
interface HackedMediaStreamEvent extends MediaStreamEvent {
  streams: Array<MediaStream>;
}

export interface RTCConfig extends RTCConfiguration {
  defaultOfferOptions?: HackedRTCOfferOptions;
  defaultAnswerOptions?: RTCAnswerOptions;
  defaultConnectionConstraints?: RTCConnectionConstraints;
  rtcpMuxPolicy?: "require" | "negotiate";
  bundlePolicy?: "balanced" | "max-compat" | "max-bundle";
}

// FIXME Can't extends RTCPeerConnection, cause createOffer & createAnswer are of the wrong type.
type HackedRTCPeerConnection = RTCPeerConnection & {
  new (config: RTCConfiguration, constraints?: RTCConnectionConstraints);
  connectionState: string; // FIXME RTCPeerConnectionState;
  ontrack: (event: HackedMediaStreamEvent) => void;
  addTrack: (track: MediaStreamTrack, stream?: MediaStream) => RTCRtpSender;
  removeTrack: (sender: RTCRtpSender) => void;
  getSenders: () => Array<RTCRtpSender>;
  createOffer: (options?: HackedRTCOfferOptions) => Promise<RTCSessionDescription>;
  createAnswer: (options?: RTCAnswerOptions) => Promise<RTCSessionDescription>;
};

function supportsTracks(pc: HackedRTCPeerConnection): boolean {
  return (typeof pc.addTrack !== "undefined") && (typeof pc.removeTrack !== "undefined");
}

// FIXME Unfuck when Chrome transitions to the Unified Plan.
export class RTCConnection {
  private call: ID;
  private peer: ID;
  private api: ArtichokeAPI;
  private events: EventHandler<Event>;
  private log: Logger;
  private conn: HackedRTCPeerConnection;
  private onICEDoneCallback: Thunk;
  private onRemoteStreamCallback: Callback<MediaStream>;
  private offerOptions: HackedRTCOfferOptions;
  private answerOptions: RTCAnswerOptions;

  // FIXME Required by the various hacks:
  private localRole: string;
  private attachedStreams: { [trackId: string]: MediaStream };
  private renegotiationTimer: number;

  constructor(call: ID, peer: ID, config: RTCConfig, log: Logger, events: EventHandler<Event>, api: ArtichokeAPI,
              constraints?: RTCConnectionConstraints, answerOptions?: RTCAnswerOptions,
              offerOptions?: HackedRTCOfferOptions) {
    log.info("Connecting an RTC connection to " + peer + " on " + call);
    this.call = call;
    this.peer = peer;
    this.api = api;
    this.events = events;
    this.log = log;
    this.answerOptions = answerOptions;
    this.offerOptions = offerOptions;
    this.conn = new (RTCPeerConnection as HackedRTCPeerConnection)(config, constraints);

    this.localRole = undefined;
    this.attachedStreams = {};

    this.onRemoteStreamCallback = (stream) => {
      // Do nothing.
    };

    this.onICEDoneCallback = () => {
      // Do nothing.
    };

    this.conn.onicecandidate = (event) => {
      if (event.candidate) {
        this.log.debug("Created ICE candidate: " + event.candidate.candidate);
        this.api.sendCandidate(this.call, this.peer, event.candidate).catch((err) => {
          this.events.notify(error("Could not send an ICE candidate.", err));
        });
      } else {
        this.log.debug("Done gathering ICE candidates.");
        this.onICEDoneCallback();
      }
    };

    this.conn.ontrack = (event: HackedMediaStreamEvent) => {
      this.log.info("Received a remote stream.");
      const streams = (typeof event.streams !== "undefined") ? event.streams : [event.stream];
      streams.forEach((stream) => {
        this.onRemoteStreamCallback(stream);
      });
    };

    this.conn.onnegotiationneeded = (event) => {
      // FIXME Chrome triggers renegotiation on... Initial offer creation...
      // FIXME Firefox triggers renegotiation when remote offer is received.
      if (this.isEstablished()) {
        this.renegotiationTimer = onceDelayed(this.renegotiationTimer, 100, () => {
          this.log.debug("Renegotiating an RTC connection.");
          this.offer().catch((err) => {
            this.events.notify(error("Could not renegotiate the connection.", err));
          });
        });
      }
    };
  }

  disconnect() {
    this.log.info("Disconnecting an RTC connection.");
    this.conn.close();
  }

  addTrack(track: MediaStreamTrack, stream?: MediaStream) {
    this.log.debug("Adding a stream track.");
    // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
    if (supportsTracks(this.conn)) {
      this.conn.addTrack(track, stream);
    } else {
      stream = stream || new MediaStream([track]);
      this.attachedStreams[track.id] = stream;
      this.conn.addStream(stream);
    }
  }

  removeTrack(track: MediaStreamTrack) {
    this.log.debug("Removing a stream track.");
    // FIXME Chrome's adapter.js shim still doesn't implement removeTrack().
    if (supportsTracks(this.conn)) {
      this.conn.getSenders().filter((s) => s.track === track).forEach((t) => this.conn.removeTrack(t));
    } else if (track.id in this.attachedStreams) {
      this.conn.removeStream(this.attachedStreams[track.id]);
    }
  }

  addCandidate(candidate: wireEvents.Candidate): Promise<void> {
    this.log.debug("Received an RTC candidate: " + candidate.candidate);
    return this.conn.addIceCandidate(new RTCIceCandidate(candidate));
  }

  offer(options?: HackedRTCOfferOptions): Promise<wireEvents.SDP> {
    this.log.debug("Creating an RTC offer.");

    return this.conn.createOffer(options || this.offerOptions).then((offer) => {
      return this.setLocalDescription(offer);
    }).then((offer) => {
      return this.api.sendDescription(this.call, this.peer, offer).then(() => offer);
    }).then((offer) => {
      this.log.debug("Sent an RTC offer: " + offer.sdp);
      return offer;
    });
  }

  addOffer(remoteDescription: wireEvents.SDP, options?: RTCAnswerOptions): Promise<wireEvents.SDP> {
    this.log.debug("Received an RTC offer.");

    return this.setRemoteDescription(remoteDescription).then((descr) => this.answer(options));
  }

  answer(options?: RTCAnswerOptions): Promise<wireEvents.SDP> {
    this.log.debug("Creating an RTC answer.");

    return this.conn.createAnswer(options || this.answerOptions).then((answer) => {
      // FIXME Chrome does not support DTLS role changes.
      return this.setLocalDescription(this.patchSDP(answer));
    }).then((answer) => {
      return this.api.sendDescription(this.call, this.peer, answer).then(() => answer);
    }).then((answer) => {
      this.log.debug("Sent an RTC answer: " + answer.sdp);
      return answer;
    });
  }

  addAnswer(remoteDescription: wireEvents.SDP): Promise<void> {
    this.log.debug("Received an RTC answer.");
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
    this.log.debug("Setting remote RTC description.");
    return this.conn.setRemoteDescription(new RTCSessionDescription(remoteDescription)).then(() => remoteDescription);
  }

  private setLocalDescription(localDescription: wireEvents.SDP): Promise<wireEvents.SDP> {
    this.log.debug("Setting local RTC description.");
    return this.conn.setLocalDescription(new RTCSessionDescription(localDescription)).then(() => localDescription);
  }

  private isEstablished(): boolean {
    // NOTE "stable" means no exchange is going on, which encompases "fresh"
    // NOTE RTC connections as well as established ones.
    if (typeof this.conn.connectionState !== "undefined") {
      return this.conn.connectionState === "connected";
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

export interface RemoteStreamCallback {
  (peer: ID, stream: MediaStream): void;
}

interface MediaStreamAndTrack {
  track: MediaStreamTrack;
  stream?: MediaStream;
}

export class RTCPool {
  private readonly uuid: UUID = randomUUID();

  private api: ArtichokeAPI;
  private events: EventHandler<Event>;
  private log: Logger;

  private call: ID;
  private config: RTCConfig;
  private connectionConstraints: RTCConnectionConstraints;
  private offerOptions: HackedRTCOfferOptions;
  private answerOptions: RTCAnswerOptions;

  private connections: { [user: string]: RTCConnection };
  private tracks: Array<MediaStreamAndTrack>;
  private onRemoteStreamCallback: RemoteStreamCallback;

  constructor(call: ID, config: RTCConfig, log: Logger, events: EventHandler<Event>, api: ArtichokeAPI) {
    this.api = api;
    this.events = events;
    this.log = log;

    this.call = call;
    this.config = config;
    this.connectionConstraints = config.defaultConnectionConstraints;
    this.offerOptions = config.defaultOfferOptions;
    this.answerOptions = config.defaultAnswerOptions;

    this.connections = {};
    this.tracks = [];

    this.onRemoteStreamCallback = (peer, stream) => {
      // Do nothing.
    };

    events.onConcreteEvent(eventTypes.RTC_DESCRIPTION, this.call, "singleton", (msg: RTCDescription) => {
      this.log.debug("Received an RTC description: " + msg.description.sdp);

      if (msg.description.type === "offer") {
        if (msg.peer in this.connections) {
          this.connections[msg.peer].addOffer(msg.description).catch((err) => {
            events.notify(error("Could not process the RTC description: ", err));
          });
        } else {
          const rtc = this.createRTC(msg.peer);
          rtc.addOffer(msg.description).catch((err) => {
            events.notify(error("Could not process the RTC description: ", err));
          });
        }
      } else if (msg.description.type === "answer") {
        if (msg.peer in this.connections) {
          this.connections[msg.peer].addAnswer(msg.description).catch((err) => {
            events.notify(error("Could not process the RTC description: ", err));
          });
        } else {
          events.notify(error("Received an invalid RTC answer from " + msg.peer));
        }
      } else {
        events.notify(error("Received an invalid RTC description type " + msg.description.type));
      }
    });

    events.onConcreteEvent(eventTypes.RTC_CANDIDATE, this.call, "singleton", (msg: RTCCandidate) => {
      this.log.debug("Received an RTC candidate: " + msg.candidate);
      if (msg.peer in this.connections) {
        this.connections[msg.peer].addCandidate(msg.candidate).catch((err) => {
          events.notify(error("Could not process the RTC candidate: ", err));
        });
      } else {
        events.notify(error("Received an invalid RTC candidate. " +  msg.peer + " is not currently in this call."));
      }
    });
  }

  onRemoteStream(callback: RemoteStreamCallback) {
    this.onRemoteStreamCallback = callback;
  }

  addTrack(track: MediaStreamTrack, stream?: MediaStream) {
    this.tracks.push({
      track,
      stream
    });
    Object.keys(this.connections).forEach((peer) => {
      this.connections[peer].addTrack(track, stream);
    });
  }

  removeTrack(track: MediaStreamTrack) {
    this.tracks = this.tracks.filter((t) => t.track !== track);
    Object.keys(this.connections).forEach((peer) => {
      this.connections[peer].removeTrack(track);
    });
  }

  create(peer: ID): RTCConnection {
    const rtc = this.createRTC(peer);
    rtc.offer(this.offerOptions).catch((err) => {
      this.events.notify(error("Could not create an RTC offer.", err));
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

  setAnswerOptions(options: RTCAnswerOptions) {
    this.answerOptions = options;
  }

  setOfferOptions(options: HackedRTCOfferOptions) {
    this.offerOptions = options;
  }

  setConnectionConstraints(constraints: RTCConnectionConstraints) {
    this.connectionConstraints = constraints;
  }

  private createRTC(peer: ID): RTCConnection {
    const rtc = createRTCConnection(this.call, peer, this.config, this.log, this.events, this.api,
                                    this.connectionConstraints, this.answerOptions, this.offerOptions);
    rtc.onRemoteStream((s) => this.onRemoteStreamCallback(peer, s));
    this.connections[peer] = rtc;
    this.tracks.forEach((t) => rtc.addTrack(t.track, t.stream));
    return rtc;
  }
}

export function createRTCConnection(call: ID, peer: ID, config: RTCConfig, log: Logger, events: EventHandler<Event>,
                                    api: ArtichokeAPI, constraints?: RTCConnectionConstraints,
                                    answerOptions?: RTCAnswerOptions,
                                    offerOptions?: HackedRTCOfferOptions): RTCConnection {
  return new RTCConnection(call, peer, config, log, events, api, constraints, answerOptions, offerOptions);
}

export function createRTCPool(call: ID, config: RTCConfig, log: Logger,
                              events: EventHandler<Event>, api: ArtichokeAPI): RTCPool {
  return new RTCPool(call, config, log, events, api);
}
