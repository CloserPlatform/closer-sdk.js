import { ArtichokeApi } from '../artichoke/artichoke-api';
import { ID } from '../protocol/protocol';
import { Observable } from 'rxjs';
import { rtcEvents } from '../protocol/events/rtc-events';
import { filter } from 'rxjs/operators';

export class SignalingClient {
    constructor(
        private callId: ID,
        private artichokeApi: ArtichokeApi,
    ) { }

    public sendIceCandidate(peerId: ID, candidate: RTCIceCandidate): void {
        return this.artichokeApi.sendCandidate(this.callId, peerId, candidate);
    }

    public sendSessionDescription(peerId: ID, sdp: RTCSessionDescriptionInit): void {
        return this.artichokeApi.sendDescription(this.callId, peerId, sdp);
    }

    public get sessionDescription$(): Observable<rtcEvents.DescriptionSent> {
        return this.rtcEvent$.pipe(filter(rtcEvents.DescriptionSent.is));
    }

    public get iceCandidate$(): Observable<rtcEvents.CandidateSent> {
        return this.rtcEvent$.pipe(filter(rtcEvents.CandidateSent.is));
    }

    private get rtcEvent$(): Observable<rtcEvents.RTCSignallingEvent> {
        return this.artichokeApi.domainEvent$
            .pipe(filter(rtcEvents.RTCSignallingEvent.is))
            .pipe(filter(e => e.callId === this.callId));
    }
}
