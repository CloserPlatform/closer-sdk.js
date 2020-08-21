// import * as View from '../view';
// import { Session, CloserSDK, callEvents, BusinessCall, CallReason } from '../../../';
import { Session, CloserSDK, UserConfig } from '../../../';
import { Logger } from '../logger';
// import { createStream } from '../stream';
// import { CallHandler } from '../call';
import { Page } from '../page';
import { CommunicatorReconnectionService } from '../call/reconnection.service';
import { ReplaySubject } from 'rxjs/internal/ReplaySubject';
import { Subject } from 'rxjs/internal/Subject';

export interface AuthCtx {
  id: string;
  apiKey: string;
}
export class SessionService {

  // Connection Events
  private readonly connectionEstablishedEvent = new ReplaySubject<void>(1);
  private readonly connectionLostEvent = new Subject<void>();

  // Internal events
  private readonly connectionErrorEvent = new Subject<void>();

  private readonly communicatorReconnectionService: CommunicatorReconnectionService;

  constructor() {
    const reconnectionTimeout = 1000;
    this.communicatorReconnectionService = new CommunicatorReconnectionService(
      reconnectionTimeout,
      this.connectionEstablishedEvent,
      this.connectionLostEvent,
      this.connectionErrorEvent
      );
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

  private setCallbacks = (session: Session): Session => {
    session.artichoke.error$.subscribe(error => {
      Logger.log('An error has occured: ', error);
      this.connectionErrorEvent.next();
    });

    session.artichoke.serverUnreachable$.subscribe(() => {
      Logger.log('Server unreachable');
      this.connectionLostEvent.next();
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

    session.artichoke.connection$.subscribe(hello => {
      Page.setHeader(`Connected as ${session.id} with deviceId: ${hello.deviceId}`);
      this.connectionEstablishedEvent.next();
      Logger.log('Connected to Artichoke!', hello);
    });

    session.artichoke.callInvitation$.subscribe(callInvitation => {
      Logger.log('Received call invitation: ', callInvitation);
      // this.handleCallInvitation(session, callInvitation);
    });

    // TODO: should reconnect?
    this.communicatorReconnectionService.enableReconnection(() => undefined);

    return session;
  }

  // private handleCallInvitation = (session: Session, callInvitation: callEvents.Invited): void =>  {
  //   session.artichoke.getCall(callInvitation.callId).then((call: BusinessCall) => {
  //     Logger.log('Call invitation metadata: ', callInvitation.metadata);
  //     const line = `${callInvitation.authorId} calls you`;
  //     const closeModal = View.confirmModal('Call invitation', line, 'Answer', () => {
  //       createStream(stream => {
  //         const callHandler = new CallHandler(call, stream.getTracks(), session);
  //         callHandler.answer()
  //           .then(() => Logger.log('Call answered'))
  //           .catch(err => {
  //             Logger.error('Call answer failed', err);
  //             alert(`Answer failed ${err}`);
  //           });
  //       });
  //     }, 'Reject', () => {
  //       Logger.log('Rejecting call...');
  //       call.reject(CallReason.CallRejected).then(
  //         res => Logger.log('Call rejected', res),
  //         err => Logger.error('Call rejecting failed', err)
  //       );
  //     });

  //     call.end$.subscribe(e => {
  //       Logger.log('Call ended: ', e.reason);
  //       closeModal();
  //     });

  //     }, err => Logger.error('Get call failed', err));
  // }
}
