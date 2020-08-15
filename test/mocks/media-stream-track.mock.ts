import { MediaTrackContentHint, ContentHint } from '../../src/rtc/media-track-content-hint';

export class MediaStreamTrackMock implements MediaStreamTrack, MediaTrackContentHint {
  public enabled: boolean;
  public readonly id: string;
  public readonly label: string;
  public readonly muted: boolean;
  public readonly isolated: boolean;
  public onisolationchange: ((ev: Event) => void) | null;
  public onended: ((ev: MediaStreamErrorEvent) => void) | null;
  public onmute: ((ev: Event) => void) | null;
  public onoverconstrained: ((ev: MediaStreamErrorEvent) => void) | null;
  public onunmute: ((ev: Event) => void) | null;
  public readonly readonly: boolean;
  public readonly readyState: MediaStreamTrackState;
  public readonly remote: boolean;

  constructor(
    public readonly kind: 'audio' | 'video',
    public contentHint?: ContentHint,
  ) {
  }

  public addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject | null,
    _options?: boolean | AddEventListenerOptions
  ): void {
    throw new Error('Not mocked');
  }

  public applyConstraints(_constraints: MediaTrackConstraints): Promise<void> {
    throw new Error('Not mocked');
  }

  public clone(): MediaStreamTrack {
    throw new Error('Not mocked');
  }

  public dispatchEvent(_evt: Event): boolean {
    throw new Error('Not mocked');
  }

  public getCapabilities(): MediaTrackCapabilities {
    throw new Error('Not mocked');
  }

  public getConstraints(): MediaTrackConstraints {
    throw new Error('Not mocked');
  }

  public getSettings(): MediaTrackSettings {
    throw new Error('Not mocked');
  }

  public removeEventListener(_type: string, _listener?: EventListenerOrEventListenerObject | null,
                             _options?: boolean | EventListenerOptions): void {
    throw new Error('Not mocked');
  }

  public stop(): void {
    throw new Error('Not mocked');
  }
}

export const getMediaStreamTrackMock = (kind: 'audio' | 'video', contentHint?: ContentHint): MediaStreamTrackMock =>
  new MediaStreamTrackMock(kind, contentHint);
