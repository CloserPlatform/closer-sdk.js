import { AgentContext, SessionData } from '../auth/auth';
import { RatelConfig } from '../config/config';
import { Logger } from '../logger';
import { RESTfulAPI } from './restful-api';

export class RatelAPI extends RESTfulAPI {
  private verifyPath = 'session/verifySig';
  private url: string;

  constructor(config: RatelConfig, log: Logger) {
    super(log);

    const pathname = config.pathname ? config.pathname : '';

    const host = `${config.hostname}:${config.port}`;
    this.url = [config.protocol, '//', host, pathname, '/api'].join('');
  }

  public verifySignature(sessionData: SessionData): Promise<AgentContext> {
    return this.post<SessionData, AgentContext>([this.url, this.verifyPath], [], sessionData);
  }
}
