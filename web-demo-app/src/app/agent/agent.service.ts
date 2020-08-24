import { SessionService } from '../session.service';
import { AgentCtx, SpinnerClient } from '@swagger/spinner';
import { Credentials } from '../credentials';
import { Session } from '@closerplatform/closer-sdk';

export class AgentService {
  public spinnerClient: SpinnerClient;
  public session: Session;

  private sessionService = new SessionService();

  public init = (agentCtx: AgentCtx, credentials: Credentials, sc: SpinnerClient): void => {
    const session = this.sessionService.connect(agentCtx, credentials);

    this.spinnerClient = sc;
    this.session = session;

    this.spinnerClient.apiKey = agentCtx.apiKey;
  }
}
