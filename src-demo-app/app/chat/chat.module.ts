import { LoginFormData, makeCallingInput } from '../view';
import { SessionService } from './session.service';
import { AuthSession } from '../login/login.service';
import { Logger } from '../logger';
import * as RatelSdk from '../../../';
import { CallHandler } from '../call';
import { createStream } from '../stream';
import { Page } from '../page';

export class ChatModule {

  private calleeInput?: JQuery;

  constructor (private sessionService: SessionService) {

  }

  public init = (authSession: AuthSession, loginFormData: LoginFormData): void => {

    this.sessionService.connect(authSession, loginFormData.artichokeServer, loginFormData.authServer).then(
      (session) => {
        this.calleeInput = this.renderChat(calleeId => this.callToUser(calleeId, session));
        Page.contents.append(this.calleeInput);

      }, this.handleConnectFailed);
  }

  private callToUser = (calleeId: string, session: RatelSdk.Session): void => {
    createStream(stream => {
      const tracks = stream.getTracks();
      session.chat.createDirectCall(tracks, calleeId)
        .then(directCall => new CallHandler(directCall, tracks, session))
        .catch(err => Logger.error(err));
    });
  }

  private handleConnectFailed = (e: Error): void => {
    Logger.error('Authorization failed', e);
    alert('Authorization failed');
  }

  private renderChat = (callingCallback: (calleeId: string) => void): JQuery =>
    makeCallingInput(Page.calleeBoxId, callingCallback, 'id', '4e37e1a8-0d0b-4dea-9a13-3a37533af8b4')
}
