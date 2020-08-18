import * as RatelSdk from '../../../';
import { SessionService } from './session.service';
import { AuthSession } from '../login/login.service';
import { LoginFormData } from '../view';
import { Logger } from '../logger';

export class BoardService {
  public session: RatelSdk.Session;
  public sessionService: SessionService;

  constructor () {
    this.sessionService = new SessionService();
  }

  public init = async (authSession: AuthSession, loginFormData: LoginFormData): Promise<boolean> => {
    try {
      const session = await this.sessionService.connect(
        authSession, loginFormData.artichokeServer, loginFormData.authServer
      );
      this.session = session;
    } catch (e) {
      Logger.error('Error initiating session', e);

      return false;
    }

    return true;
  }

}
