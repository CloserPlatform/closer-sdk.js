import { Session, BrowserUtils } from '../../../';
import { createStream } from '../stream';
import { CallHandler } from './call-handler';
import { Logger } from '../logger';

export class CallService {

  constructor (public session: Session) { }

  public callToUser = (calleeId: string): void => {
    if (this.session) {
      createStream(stream => {
        const tracks = stream.getTracks();
        this.session.artichoke.createDirectCall(tracks, calleeId, undefined,
          {browser: BrowserUtils.getBrowserName()})
          .then(directCall => new CallHandler(directCall, tracks, () => alert('Not implemented')))
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
