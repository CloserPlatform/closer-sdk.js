import { Logger } from '../logger';
import { errorEvents } from '../protocol/events/error-events';
import { rtcEvents } from '../protocol/events/rtc-events';
import { ArtichokeAPI } from '../apis/artichoke-api';
import { ID } from '../protocol/protocol';
import { EventHandler } from '../events/event-handler';
import { RTCConfig } from './rtc-config';
import { RTCConnectionConstraints } from './rtc-connection-constraints';
import { HackedRTCOfferOptions } from './hacked-rtc-offer-options';
import { RTCAnswerOptions } from './rtc-answer-options';
import { RTCConnection } from './rtc-connection';
import { MediaStreamAndTrack } from './mediastream-and-track';
import { RemoteStreamCallback } from './remote-stream-callback';
import { createRTCConnection } from './create-rtc-connection';

export class RTCPool {
    private api: ArtichokeAPI;
    private events: EventHandler;
    private log: Logger;

    private call: ID;
    private config: RTCConfig;
    private connectionConstraints?: RTCConnectionConstraints;
    private offerOptions?: HackedRTCOfferOptions;
    private answerOptions?: RTCAnswerOptions;

    private connections: { [user: string]: RTCConnection };
    private tracks: Array<MediaStreamAndTrack>;
    private onRemoteStreamCallback: RemoteStreamCallback;

    constructor(call: ID, config: RTCConfig, log: Logger, events: EventHandler, api: ArtichokeAPI) {
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

        this.onRemoteStreamCallback = (_peer, _stream): void => {
            this.log.warn('Event onRemoteStream received but not handled!');
        };

        events.onConcreteEvent(rtcEvents.DescriptionSent.tag, this.call, 'singleton',
            (msg: rtcEvents.DescriptionSent) => {
            this.log.debug(`Received an RTC description: ${msg.sdp.sdp}`);

            if (msg.sdp.type === 'offer') {
                if (msg.sender in this.connections) {
                    this.connections[msg.sender].addOffer(msg.sdp).catch((err) => {
                        events.notify(new errorEvents.Error(`Could not process the RTC description: ${err}`));
                    });
                } else {
                    const rtc = this.createRTC(msg.sender);
                    rtc.addOffer(msg.sdp).catch((err) => {
                        events.notify(new errorEvents.Error(`Could not process the RTC description: ${err}`));
                    });
                }
            } else if (msg.sdp.type === 'answer') {
                if (msg.sender in this.connections) {
                    this.connections[msg.sender].addAnswer(msg.sdp).catch((err) => {
                        events.notify(new errorEvents.Error(`Could not process the RTC description: ${err}`));
                    });
                } else {
                    events.notify(new errorEvents.Error(`Received an invalid RTC answer from ${msg.sender}`));
                }
            } else {
                events.notify(new errorEvents.Error(`Received an invalid RTC description type ${msg.sdp.type}`));
            }
        });

        events.onConcreteEvent(rtcEvents.CandidateSent.tag, this.call, 'singleton', (msg: rtcEvents.CandidateSent) => {
            this.log.debug(`Received an RTC candidate: ${msg.candidate}`);
            if (msg.sender in this.connections) {
                this.connections[msg.sender].addCandidate(msg.candidate).catch((err) => {
                    events.notify(new errorEvents.Error(`Could not process the RTC candidate: ${err}`));
                });
            } else {
                events.notify(new errorEvents.Error(
                  `Received an invalid RTC candidate. ${msg.sender} is not currently in this call.`));
            }
        });
    }

    public onRemoteStream(callback: RemoteStreamCallback): void {
        this.onRemoteStreamCallback = callback;
    }

    public addTrack(track: MediaStreamTrack, stream?: MediaStream): void {
        this.tracks.push({
            track,
            stream
        });
        Object.keys(this.connections).forEach((peer) => {
            this.connections[peer].addTrack(track, stream);
        });
    }

    public removeTrack(track: MediaStreamTrack): void {
        this.tracks = this.tracks.filter((t) => t.track !== track);
        Object.keys(this.connections).forEach((peer) => {
            this.connections[peer].removeTrack(track);
        });
    }

    public create(peer: ID): RTCConnection {
        const rtc = this.createRTC(peer);
        rtc.offer(this.offerOptions).catch((err) => {
            this.events.notify(new errorEvents.Error(`Could not create an RTC offer: ${err}`));
        });

        return rtc;
    }

    public destroy(peer: ID): void {
        if (peer in this.connections) {
            this.connections[peer].disconnect();
            delete this.connections[peer];
        }
    }

    public destroyAll(): void {
        Object.keys(this.connections).forEach((key) => this.destroy(key));
    }

    public setAnswerOptions(options: RTCAnswerOptions): void {
        this.answerOptions = options;
    }

    public setOfferOptions(options: HackedRTCOfferOptions): void {
        this.offerOptions = options;
    }

    public setConnectionConstraints(constraints: RTCConnectionConstraints): void {
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
