// tslint:disable:no-any
// tslint:disable:no-namespace
// tslint:disable:max-classes-per-file
import { VideoContentType } from '../protocol';
import { DomainCommand } from './domain-command';

export namespace callCommand {

  export abstract class CallCommand implements DomainCommand {

    public readonly callId: string;
    public readonly tag: string;
    public readonly __discriminator__ = 'domainCommand';

    protected constructor(callId: string, tag: string) {
      this.callId = callId;
      this.tag = tag;
    }
  }

  export class AudioStreamToggle extends CallCommand {
    public static readonly tag = 'audio_stream_toggle';

    public readonly enabled: boolean;
    public readonly timestamp: number;

    constructor(callId: string, enabled: boolean, timestamp: number) {
      super(callId, AudioStreamToggle.tag);
      this.enabled = enabled;
      this.timestamp = timestamp;
    }
  }

  export class VideoStreamToggle extends CallCommand {
    public static readonly tag = 'video_stream_toggle';

    public readonly enabled: boolean;
    public readonly timestamp: number;
    public readonly content?: VideoContentType;

    constructor(callId: string, enabled: boolean, timestamp: number, contentType?: VideoContentType) {
      super(callId, VideoStreamToggle.tag);
      this.enabled = enabled;
      this.timestamp = timestamp;
      this.content = contentType;
    }
  }

}
