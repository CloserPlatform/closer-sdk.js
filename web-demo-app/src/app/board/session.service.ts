import * as View from '../view';
import { Session, CloserSDK, UserConfig, Call, CallReason } from 'closer-sdk-js';
import { Logger } from '../logger';
import { createStream } from '../stream';
import { CallHandler } from '../call/call-handler';
import { Page } from '../page';
import { Subscription } from 'rxjs';

export interface AuthCtx {
  id: string;
  apiKey: string;
}
export class SessionService {

  private sessionSubscription?: Subscription;

  constructor() {
  }

  public connect = (authCtx: AuthCtx, artichokeServer: string, spinnerServer: string): Session => {
    Logger.log(`Connecting to ${artichokeServer} as: ${JSON.stringify(authCtx)}`);

    const userConfig: UserConfig = {
      logLevel: 0,
      spinner: { server: spinnerServer },
      artichoke: { server: artichokeServer }
    };

    const session = CloserSDK.init(authCtx.id, authCtx.apiKey, userConfig);

    this.setCallbacks(session);

    return session;
  }

  public disconnect(): void {
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
    }
  }

  private setCallbacks = (session: Session): Session => {
    session.artichoke.error$.subscribe(error => {
      Logger.log('An error has occured: ', error);
    });

    session.artichoke.serverUnreachable$.subscribe(() => {
      Logger.log('Server unreachable');
    });

    session.artichoke.roomCreated$.subscribe(m => {
      Logger.log('Room created: ', m);
    });

    session.artichoke.roomInvitation$.subscribe(invitation => {
      Logger.log('Received room invitation: ', invitation);
    });

    session.artichoke.callCreated$.subscribe(call => {
      Logger.log('Call created: ', call);
    });

    session.artichoke.callInvitation$.subscribe(async callInvitation => {
      Logger.log('Received call invitation: ', callInvitation);
      try {
        const call = await session.artichoke.getCall(callInvitation.callId);
        this.handleCallInvitation(call);
      } catch (err) {
        Logger.error('Could not get call for call invitation', err, callInvitation);
      }
    });

    this.sessionSubscription = session.artichoke.connection$.subscribe(
      () => {
        Page.setHeader(`Connected Session(${session.id})`);
        Logger.log('Connected to Artichoke!');
      },
      err => Logger.error('Connection error', err),
      () => {
        Page.setHeader(`Disconnected Session(${session.id})`);
        Logger.log('Session disconnected');
      }
    );
    Page.setHeader(`Connecting..`);

    return session;
  }

  private handleCallInvitation = (call: Call): void => {
    const line = `${call.creator} calls you`;
    const closeModal = View.confirmModal('Call invitation', line, 'Answer', () => {
      createStream(stream => {
        const callHandler = new CallHandler(call, stream.getTracks(), () => this.disconnect());
        callHandler.answer()
          .then(() => Logger.log('Call answered'))
          .catch(err => {
            Logger.error('Call answer failed', err);
            alert(`Answer failed ${err}`);
          });
      });
    }, 'Reject', () => {
      Logger.log('Rejecting call...');
      call.reject(CallReason.CallRejected).then(
        res => Logger.log('Call rejected', res),
        err => Logger.error('Call rejecting failed', err)
      );
    });

    call.end$.subscribe(e => {
      Logger.log('Call ended: ', e.reason);
      closeModal();
    });
  }
}
