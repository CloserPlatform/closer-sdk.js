// tslint:disable:no-floating-promises
import { LoginFormData, makeLoginForm } from '../view';
import { Page } from '../page';
import { Credentials } from '../credentials';
import { Session, CloserSDK } from '../../../../dist';

export class AgentModule {
  private loginBox?: JQuery;

  constructor(
    private closerSDK: CloserSDK,
  ) {

  }

  public init(): void {

    if (credentials.isSessionSaved()) {
      const agentCtx = this.getSession(credentials);
      await this.proceedToAgentModule(agentCtx, credentials);
    } else {
      this.render(credentials);
    }
  }

  private async proceedToAgentModule(session: Session, credentials: Credentials): Promise<void> {
    credentials.setAgentCtx(agentCtx.id, agentCtx.orgId, agentCtx.apiKey);
    const agentModule = new AgentModule();
    agentModule.init(agentCtx, credentials);
  }

  private async handleLoginProbe(formData: LoginFormData, credentials: Credentials): Promise<void> {
    credentials.setCredentials(formData.userEmail, formData.userPassword);

    try {
      const agentCtx =  await this.login(credentials);
      if (this.loginBox) {
        this.loginBox.hide();
      }
      this.proceedToAgentModule(agentCtx, credentials);
    } catch (e) {
      alert('Error logging');
    }
  }

  private async login(credentials: Credentials): Promise<Session> {
    return this.closerSDK.loginAsAgent(credentials.email, credentials.pwd);
  }

  private getSession(credentials: Credentials): Session {
    return this.closerSDK.withSession(credentials.id, credentials.apiKey);
  }

  private render(credentials: Credentials): void {
    this.loginBox = makeLoginForm('login-box', (formData) => this.handleLoginProbe(formData, credentials));
    Page.contents.empty();
    Page.contents.append(this.loginBox);
  }
}
