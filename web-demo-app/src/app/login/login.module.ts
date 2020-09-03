// tslint:disable:no-floating-promises
import { LoginService } from './login.service';
import { LoginFormData, makeLoginForm } from '../view';
import { Page } from '../page';
import { Credentials } from '../credentials';
import { AgentModule } from '../agent.module';
import { Session, CloserSDK } from '../../../../dist';

export class LoginModule {
  private loginBox?: JQuery;

  constructor(
    private loginService: LoginService,
  ) {

  }

  public async init(closerSdk: CloserSDK): void {

    if (credentials.isSessionSaved()) {
      const agentCtx = this.loginService.getSession(credentials);
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
      const agentCtx =  await this.loginService.login(credentials);
      if (this.loginBox) {
        this.loginBox.hide();
      }
      this.proceedToAgentModule(agentCtx, credentials);
    } catch (e) {
      alert('Error logging');
    }
  }

  private render(credentials: Credentials): void {
    this.loginBox = makeLoginForm('login-box', (formData) => this.handleLoginProbe(formData, credentials));
    Page.contents.empty();
    Page.contents.append(this.loginBox);
  }
}
