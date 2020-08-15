import { VideoHint, AudioHint } from '../rtc/media-track-content-hint';

export interface RTCConfig extends RTCConfiguration {
    optimizeVideoForFPS?: boolean;
    reconnectOnFailure?: boolean;
    videoHint?: VideoHint;
    audioHint?: AudioHint;
}
