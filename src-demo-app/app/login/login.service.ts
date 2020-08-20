import { SpinnerClient, LoginForm, AgentCtx } from '@swagger/spinner';
import { Credentials } from '../credentials';

export interface AuthSession {
  id: string;
  apiKey: string;
}

export class LoginService {
  public spinnerClient: SpinnerClient;

  public login = async (credentials: Credentials): Promise<AgentCtx> => {
    const loginForm: LoginForm = {
      email: credentials.email,
      password: credentials.pwd
    };

    const agentCtx = this.spinnerClient.login(loginForm);

    return agentCtx;
  }
}
