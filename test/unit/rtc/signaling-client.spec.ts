import { SignalingClient } from '../../../src/rtc/signaling-client';
import { getArtichokeApiMock } from '../../mocks/artichoke-api.mock';
import { of } from 'rxjs';
import { rtcEvents } from '../../../src';

const callId = 'callId';
const peerId = 'peerId';
const candidate: RTCIceCandidate = {} as RTCIceCandidate;
const sdp: RTCSessionDescriptionInit = {} as RTCSessionDescriptionInit;

export const getSignalingClient = (
    artichokeApi = getArtichokeApiMock(),
    id = callId,
): SignalingClient =>
    new SignalingClient(
        id,
        artichokeApi
    );

describe('SiganlingClient', () => {
    it('sendIceCandidate should call api', () => {
        const api = getArtichokeApiMock();
        spyOn(api, 'sendCandidate');
        const client = getSignalingClient(api);
        client.sendIceCandidate(peerId, candidate);
        expect(api.sendCandidate).toHaveBeenCalledWith(callId, peerId, candidate);
    });

    it('sendSessionDescription should call api', () => {
        const api = getArtichokeApiMock();
        spyOn(api, 'sendDescription');
        const client = getSignalingClient(api);
        client.sendSessionDescription(peerId, sdp);
        expect(api.sendDescription).toHaveBeenCalledWith(callId, peerId, sdp);
    });

    it('iceCandidate$ return candidate', done => {
        const api = getArtichokeApiMock();
        const event = new rtcEvents.CandidateSent(callId, peerId, candidate);
        spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
        const client = getSignalingClient(api);
        client.iceCandidate$.subscribe(res => {
            expect(res.callId).toBe(callId);
            expect(res.sender).toBe(peerId);
            expect(res.candidate).toBe(candidate);
            done();
        }, done.fail);
    });

    it('sessionDescription$ return candidate', done => {
        const api = getArtichokeApiMock();
        const event = new rtcEvents.DescriptionSent(callId, peerId, sdp);
        spyOnProperty(api, 'domainEvent$', 'get').and.returnValue(of(event));
        const client = getSignalingClient(api);
        client.sessionDescription$.subscribe(res => {
            expect(res.callId).toBe(callId);
            expect(res.sender).toBe(peerId);
            expect(res.sdp).toBe(sdp);
            done();
        }, done.fail);
    });
});
