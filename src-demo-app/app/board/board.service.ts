import { SpinnerClient, AgentCtx } from '@swagger/spinner';
import * as RatelSdk from '../../../';
import { SessionService } from './session.service';
import { LoginFormData } from '../view';
import { Logger } from '../logger';
import { Credentials } from '../credentials';

export class BoardService {
  public session: RatelSdk.Session;
  public sessionService: SessionService;
  public spinnerClient: SpinnerClient;

  constructor () {
    this.sessionService = new SessionService();
  }

  public init = async (agentCtx: AgentCtx, credentials: Credentials, sc: SpinnerClient)
    : Promise<void> => {
    const session = await this.sessionService.connect(
      agentCtx, credentials.artichokeServer, credentials.authServer
      );
    this.spinnerClient = sc;
    this.session = session;
  }
}
