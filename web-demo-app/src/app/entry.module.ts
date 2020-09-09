import { makeButton, makeServersForm, makeDiv } from './view';
import { Page } from './page';
import { Nav } from './nav';
import { AgentModule } from './agent/agent.module';
import { GuestModule } from './guest.module';
import { Credentials, Servers, SessionDetails } from './credentials';
import { CloserSDK } from '../../../dist';

export class EntryModule {

  constructor(
    private html: JQuery,
    private credentials: Credentials,
  ) {
  }

  public init(): void {
    Nav.setLogoutCallback(() => {
      this.credentials.clear();
      location.reload();
    });

    const maybeServers = this.credentials.getServers();
    const maybeSession = this.credentials.getSession();

    if (maybeServers && maybeSession) {
      return this.handleExistingSession(maybeServers, maybeSession);
    } else {
      return this.handleNewSession(maybeServers);
    }
  }

  private handleExistingSession(servers: Servers, session: SessionDetails): void {
    const closerSdk = this.getCloserSDK(servers);
    if (session.isGuest) {
      const guestModule = new GuestModule(makeDiv(), closerSdk, this.credentials);

      return guestModule.init();
    } else {
      const agentModule = new AgentModule(closerSdk);

      return agentModule.init();
    }
  }

  private handleNewSession(maybeServers?: Servers): void {
    const servers = maybeServers || {
      spinner: 'https://spinner.closer.app',
      artichoke: 'https://artichoke.closer.app'
    };

    return this.render(servers);
  }

  private render(servers: Servers): void {
    const form = makeServersForm(Page.artichokeFormId, Page.authFormId, servers);
    const existingButton = makeButton('btn-info mx-2', 'CONTINUE AS AGENT', () => this.agentLoginCallback());
    const guestButton = makeButton('btn-info mx-2', 'CONTINUE AS GUEST', () => this.guestLoginCallback());

    const buttonsContainer = makeDiv().prop({
      class: 'd-flex justify-content-center align-items-center m-3'
    }).append([existingButton, guestButton]);

    this.html.append([form, buttonsContainer]);

    Page.contents.empty();
    Page.contents.append(this.html);
  }

  private agentLoginCallback(): void {
    const servers = this.getServerInputs();
    if (servers) {
      this.credentials.setServers(servers);
      this.html.hide();

      const closerSdk = this.getCloserSDK(servers);
      const agentModule = new AgentModule(closerSdk);

      return agentModule.init();
    } else {
      return alert('Empty servers inputs');
    }
  }

  private guestLoginCallback(): void {
    const servers = this.getServerInputs();
    if (servers) {
      this.credentials.setServers(servers);
      this.html.hide();

      const guestModule = new GuestModule(makeDiv(), this.getCloserSDK(servers), this.credentials);

      return guestModule.init();
    } else {
      return alert('Empty servers inputs');
    }
  }

  private getServerInputs(): Servers | undefined {
    const artichoke = String($(`#${Page.artichokeFormId}`).val());
    const spinner = String($(`#${Page.authFormId}`).val());

    if (artichoke && spinner) {
      return { artichoke, spinner };
    } else {
      return undefined;
    }
  }

  private getCloserSDK(servers: Servers): CloserSDK {
    const userConfig = {
      logLevel: 0,
      spinner: { server: servers.spinner },
      artichoke: { server: servers.artichoke }
    };

    return CloserSDK.init(userConfig);
  }
}
