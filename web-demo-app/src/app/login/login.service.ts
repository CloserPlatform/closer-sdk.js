import { Credentials } from '../credentials';
import { CloserSDK, Session } from '../../../../dist';

export class LoginService {

  constructor(private closerSDK: CloserSDK) { }

  public async login(credentials: Credentials): Promise<Session> {
    return this.closerSDK.loginAsAgent(credentials.email, credentials.pwd);
  }

  public getSession(credentials: Credentials): Session {
    return this.closerSDK.withSession(credentials.id, credentials.apiKey);
  }
}
