import { SpinnerClient, LoginForm, AgentCtx } from '@swagger/spinner';
import { Credentials } from '../credentials';
import { Logger } from '../logger';

export class LoginService {
  public spinnerClient: SpinnerClient;

  public login = async (credentials: Credentials): Promise<AgentCtx> => {
    const loginForm: LoginForm = {
      email: credentials.email,
      password: credentials.pwd
    };

    const agentCtx = await this.spinnerClient.login(loginForm);

    return agentCtx;
  }

  public getSession = async (credentials: Credentials): Promise<AgentCtx> => {
    this.spinnerClient.apiKey = credentials.apiKey;
    const agentCtx = await this.spinnerClient.getSession();

    return agentCtx;
  }
}
