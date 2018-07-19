import { AgentContext, SessionData } from '../auth/auth';
import { RatelConfig } from '../config/config';
import { RESTfulAPI } from './restful-api';
import { LoggerFactory } from '../logger/logger-factory';

export class RatelAPI extends RESTfulAPI {
  private verifyPath = 'session/verifySig';
  private url: string;

  constructor(config: RatelConfig, loggerFactory: LoggerFactory) {
    super(loggerFactory.create('RatelAPI'));

    const pathname = config.pathname ? config.pathname : '';

    const host = `${config.hostname}:${config.port}`;
    this.url = [config.protocol, '//', host, pathname, '/api'].join('');
  }

  public verifySignature(sessionData: SessionData): Promise<AgentContext> {
    return this.post<SessionData, AgentContext>([this.url, this.verifyPath], [], sessionData);
  }
}
