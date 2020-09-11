/* 
import { Session } from '@closerplatform/closer-sdk';
import { createStream } from '../stream';
import { CallHandler } from './call-handler';
import { Logger } from '../logger';

export class CallService {

  constructor(
    private session: Session,
  ) {
  }

  public async callToUser(calleeId: string): Promise<void> {
    const stream = await createStream();

    const tracks = stream.getTracks();

    try {
      const callResponse = await this.session.spinner.createCall({ invitee: calleeId });
      const call = await this.session.artichoke.getCall(callResponse.id);
      Logger.log('Created direct call');

      // tslint:disable-next-line:no-unused-expression
      new CallHandler(call, tracks, () => alert('Not implemented'));
    } catch (e) {
      alert(`Failed at creating call - ${e}`);
    }
  }
}
 */