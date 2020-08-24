// tslint:disable:no-floating-promises
import { SpinnerClient, AgentCtx } from '@swagger/spinner';
import { LoginService } from './login.service';
import { LoginFormData, makeLoginForm } from '../view';
import { Page } from '../page';
import { Credentials } from '../credentials';
import { AgentModule } from '../agent/agent.module';

export class LoginModule {
  private loginBox?: JQuery;
  private credentials: Credentials;
  private loginService = new LoginService();

  public init = async (credentials: Credentials, spinnerClient: SpinnerClient): Promise<void> => {
    this.credentials = credentials;
    this.loginService.spinnerClient = spinnerClient;

    if (this.credentials.isSessionSaved()) {
      const agentCtx = await this.loginService.getSession(this.credentials);
      await this.proceedToAgentModule(agentCtx);
    } else {
      this.render();
    }
  }

  private proceedToAgentModule = async (agentCtx: AgentCtx): Promise<void> => {
    this.credentials.setAgentCtx(agentCtx.id, agentCtx.orgId, agentCtx.apiKey);
    const agentModule = new AgentModule();
    agentModule.init(agentCtx, this.credentials, this.loginService.spinnerClient);
  }

  private handleLoginProbe = async (formData: LoginFormData): Promise<void> => {
    this.credentials.setCredentials(formData.userEmail, formData.userPassword);

    try {
      const agentCtx =  await this.loginService.login(this.credentials);
      if (this.loginBox) {
        this.loginBox.hide();
      }
      this.proceedToAgentModule(agentCtx);
    } catch (e) {
      alert('Error logging');
    }
  }

  private render = (): void => {
    this.loginBox = makeLoginForm('login-box', this.handleLoginProbe);
    Page.contents.empty();
    Page.contents.append(this.loginBox);
  }
}
