import * as View from '../view';
import { Session, Call, CallReason, serverEvents } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { createStream } from './stream';
import { CallHandler } from './call-handler';
import { Page } from '../page';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { makeDiv } from '../view';

export class SessionService {

  private readonly disconnectEvent = new Subject<void>();

  public connect(session: Session): Session {

    Logger.log(`Connecting as: ${JSON.stringify(session)}`);

    this.setCallbacks(session);

    return session;
  }

  public disconnect(): void {
    this.disconnectEvent.next();
  }

  private setCallbacks(session: Session): Session {
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

    session.artichoke.connection$.pipe(
      takeUntil(this.disconnectEvent),
    ).subscribe(
      (hello: serverEvents.Hello) => {
        Page.setHeader(`Connected Session(${session.id})`);
        Logger.log('Connected to Artichoke!', hello);
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

  private handleCallInvitation(call: Call): void {
    const line = `${call.creator} calls you`;
    const closeModal = View.confirmModal('Call invitation', line, 'Answer', async () => {
      const stream = await createStream();
      const callHandler = new CallHandler(makeDiv(), call, stream.getTracks(), () => this.disconnect());
      callHandler.answer()
        .then(() => Logger.log('Call answered'))
        .catch(err => {
          Logger.error('Call answer failed', err);
          alert(`Answer failed ${err}`);
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
