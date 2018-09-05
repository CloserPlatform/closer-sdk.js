import * as View from '../view';
import * as RatelSDK from '../../../';
import { Logger } from '../logger';
import { createStream } from '../stream';
import { AuthSession } from '../login/login.service';
import { UrlService } from '../url.service';
import { CallHandler } from '../call';
import { Page } from '../page';

export class SessionService {

  public connect = (session: AuthSession, artichokeServer: string, authServer: string): Promise<RatelSDK.Session> => {
    const chatUrl = UrlService.getURL(artichokeServer);
    const ratelUrl = UrlService.getURL(authServer);

    Logger.log(`Connecting to ${chatUrl} as: ${JSON.stringify(session)}`);

    return RatelSDK.withApiKey(
      session.id,
      session.apiKey,
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
                'turn:turn.ratel.im:443?transport=udp',
                'turn:turn.ratel.im:443?transport=tcp',
                'stun:turn.ratel.im:443'
              ],
              username: 'test123',
              credential: 'test456'
            }]
          }
        }
      }).then(this.onRatelConnected);
  }

  private onRatelConnected = (session: RatelSDK.Session): RatelSDK.Session => {

    session.chat.error$.subscribe(error => {
      Logger.log('An error has occured: ', error);
    });

    session.chat.disconnect$.subscribe(close => {
      Page.setHeader(`Disconnected`);
      Logger.log('Session disconnected: ', close);
      alert('Diconnected from artichoke, click to reload demo app');
      // window.location.reload();
    });

    session.chat.serverUnreachable$.subscribe(() => {
      Logger.log('Server unreachable');
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
      Logger.log('Connected to Artichoke!', hello);
    });

    session.chat.callInvitation$.subscribe(callInvitation => {
      Logger.log('Received call invitation: ', callInvitation);
      this.handleCallInvitation(session, callInvitation);
    });

    session.chat.connect();
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
