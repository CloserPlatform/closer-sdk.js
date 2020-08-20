import { AgentCtx } from '@swagger/spinner';
import * as View from '../view';
import * as RatelSDK from '../../../';
import { Logger } from '../logger';
import { createStream } from '../stream';
import { UrlService } from '../url.service';
import { CallHandler } from '../call';
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

  public connect = (authCtx: AuthCtx, artichokeServer: string, authServer: string): Promise<RatelSDK.Session> => {
    const chatUrl = UrlService.getURL(artichokeServer);
    const ratelUrl = UrlService.getURL(authServer);

    Logger.log(`Connecting to ${chatUrl} as: ${JSON.stringify(authCtx)}`);

    return RatelSDK.withApiKey(
      authCtx.id,
      authCtx.apiKey,
      {
        logLevel: 0,
        ratel: {
          protocol: ratelUrl.protocol,
          hostname: ratelUrl.hostname,
          port: ratelUrl.port,
        },
        chat: {
          protocol: chatUrl.protocol,
          hostname: chatUrl.hostname,
          port: chatUrl.port,
          rtc: {
            negotiationNeededDisabled: true,
            iceTransportPolicy: 'all',
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require',
            iceServers: [{
              urls: [
                'turn:turn.closer.app:443?transport=udp',
                'turn:turn.closer.app:443?transport=tcp',
                'stun:turn.closer.app:443'
              ],
              username: 'closer-user',
              credential: 'roxU2H%hJ7NNuiPlunS@zq+o'
            }]
          }
        }
      }).then(this.onRatelConnected);
  }

  private onRatelConnected = (session: RatelSDK.Session): RatelSDK.Session => {

    session.chat.heartbeat$.subscribe(hb => {
      Logger.log('Server time: ', hb.timestamp);
    });

    session.chat.error$.subscribe(error => {
      Logger.log('An error has occured: ', error);
      this.connectionErrorEvent.next();
    });

    session.chat.disconnect$.subscribe(close => {
      Page.setHeader(`Disconnected`);
      Logger.log('Session disconnected: ', close);
    });

    session.chat.serverUnreachable$.subscribe(() => {
      Logger.log('Server unreachable');
      this.connectionLostEvent.next();
    });

    session.chat.roomCreated$.subscribe(m => {
      Logger.log('Room created: ', m);
    });

    session.chat.roomInvitation$.subscribe(invitation => {
      Logger.log('Received room invitation: ', invitation);
    });

    session.chat.callCreated$.subscribe(call => {
      Logger.log('Call created: ', call);
    });

    session.chat.connect$.subscribe(hello => {
      Page.setHeader(`Connected as ${session.id} with deviceId: ${hello.deviceId}`);
      this.connectionEstablishedEvent.next();
      Logger.log('Connected to Artichoke!', hello);
    });

    session.chat.callInvitation$.subscribe(callInvitation => {
      Logger.log('Received call invitation: ', callInvitation);
      this.handleCallInvitation(session, callInvitation);
    });

    session.chat.connect();
    const chat = session.chat;
    this.communicatorReconnectionService.enableReconnection(chat.connect.bind(chat));
    Page.setHeader(`Connecting..`);

    return session;
  }

  private handleCallInvitation = (session: RatelSDK.Session, callInvitation: RatelSDK.callEvents.Invited): void =>  {
    session.chat.getCall(callInvitation.callId).then((call: RatelSDK.BusinessCall) => {
      Logger.log('Call invitation metadata: ', callInvitation.metadata);
      const line = `${callInvitation.authorId} calls you`;
      const closeModal = View.confirmModal('Call invitation', line, 'Answer', () => {
        createStream(stream => {
          const callHandler = new CallHandler(call, stream.getTracks(), session);
          callHandler.answer()
            .then(() => Logger.log('Call answered'))
            .catch(err => {
              Logger.error('Call answer failed', err);
              alert(`Answer failed ${err}`);
            });
        });
      }, 'Reject', () => {
        Logger.log('Rejecting call...');
        call.reject(RatelSDK.CallReason.CallRejected).then(
          res => Logger.log('Call rejected', res),
          err => Logger.error('Call rejecting failed', err)
        );
      });

      call.end$.subscribe(e => {
        Logger.log('Call ended: ', e.reason);
        closeModal();
      });

      }, err => Logger.error('Get call failed', err));
  }
}
