import * as RatelSdk from '../../../';
import { createStream } from '../stream';
import { BrowserUtils } from '../../../src/main';
import { CallHandler } from '../call';
import { Logger } from '../logger';

export class CallService {

  constructor (public session: RatelSdk.Session) { }

  public callToUser = (calleeId: string): void => {
    if (this.session) {
      createStream(stream => {
        const tracks = stream.getTracks();
        this.session.chat.createDirectCall(tracks, calleeId, undefined, {browser: BrowserUtils.getBrowserName()})
          .then(directCall => new CallHandler(directCall, tracks, this.session))
          .catch(err => {
            Logger.error(err);
            alert(`Failed to create call ${err}`);
          });
      });
    } else {
      Logger.error('No session');
    }
  }
}
