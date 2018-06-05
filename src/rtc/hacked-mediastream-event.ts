// FIXME Hackarounds for unstable API.
export interface HackedMediaStreamEvent extends MediaStreamEvent {
    streams: MediaStream[];
}
