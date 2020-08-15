import { SessionData, AgentContext } from '../protocol/protocol';
import { HttpClient } from '../http/http-client';

export class SpinnerApi {
  private verifyPath = 'session/verifySig';

  constructor(
    private httpClient: HttpClient,
    ) {
  }

  public verifySignature(sessionData: SessionData): Promise<AgentContext> {
    return this.httpClient.post(this.verifyPath, sessionData);
  }
}
