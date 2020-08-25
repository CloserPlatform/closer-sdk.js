// tslint:disable: no-unused-expression
import { SpinnerClient, CreateCall, Call } from '@swagger/spinner';
import { Session } from '@closerplatform/closer-sdk';
import { createStream } from '../stream';
import { CallHandler } from './call-handler';
import { Logger } from '../logger';
import { Credentials } from '../credentials';

export class CallService {

  constructor (public session: Session, public spinnerClient: SpinnerClient) { }

  public callToUser = async (calleeId: string, credentials: Credentials): Promise<void> => {
    if (this.session) {
      createStream(stream => {
        const tracks = stream.getTracks();

        if (!credentials.deviceId) {
          alert('No device id in credentials');

          return;
        }

        const body  = new CreateCall({ invitee: calleeId });

        this.spinnerClient.createCall(credentials.deviceId, body)
        .on200(async (callResponse: Call) => {
          const call = await this.session.artichoke.getCall(callResponse.id);
          Logger.log('Created direct call');

          new CallHandler(call, tracks, () => alert('Not implemented'));
        })
        .onUnhandled((data, res) => {
          alert(`Failed at creating call - ${res.statusText}: ${data}: `);
        });
      });
    } else {
      Logger.error('No session');
    }
  }
}
