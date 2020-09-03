import { makeButton, makeServersForm, makeDiv } from './view';
import { Page } from './page';
import { Nav } from './nav';
import { LoginModule } from './login/login.module';
import { GuestModule } from './guest.module';
import { Credentials } from './credentials';
import { CloserSDK } from '../../../dist';

interface Servers {
  readonly artichoke: string;
  readonly spinner: string;
}

export class EntryModule {

  constructor(
    private html: JQuery,
    private loginModule: LoginModule,
    private guestModule: GuestModule,
    private credentials: Credentials,
  ) { }

  public init(): void {
    Nav.setLogoutCallback(() => {
      this.credentials.clear();
      location.reload();
    });

    const maybeServers = this.credentials.getServers();

    if (maybeServers) {
      const closerSdk = this.getCloserSDK(maybeServers);
      if (this.credentials.isGuest) {
        return this.guestModule.init(closerSdk);
      } else {
        return this.loginModule.init(closerSdk);
      }
    } else {
      return this.render();
    }
  }

  private render(): void {
    const form = makeServersForm(Page.artichokeFormId, Page.authFormId);
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

      return this.loginModule.init(this.getCloserSDK(servers));
    } else {
      return alert('Empty servers inputs');
    }
  }

  private guestLoginCallback(): void {
    const servers = this.getServerInputs();
    if (servers) {
      this.credentials.setServers(servers);
      this.html.hide();

      return this.guestModule.init(this.getCloserSDK(servers));
    } else {
      return alert('Empty servers inputs');
    }
  }

  private getServerInputs(): Servers | undefined {
    const artichoke = String($(`#${Page.artichokeFormId}`).val());
    const spinner = String($(`#${Page.authFormId}`).val());

    if (artichoke && spinner) {
      return {artichoke, spinner};
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
