import { SpinnerClient } from '@swagger/spinner';
import { makeButton, makeServersForm, makeDiv } from '../view';
import { Page } from '../page';
import { Nav } from '../nav';
import { LoginModule } from '../login/login.module';
import { GuestModule } from '../guest/guest.module';
import { Credentials } from '../credentials';

export class EntryModule {
  private loginModule: LoginModule;
  private guestModule: GuestModule;
  private credentials: Credentials;
  private spinnerClient: SpinnerClient;

  private inner: JQuery;

  public init = (): void => {
    this.credentials = new Credentials();
    this.loginModule = new LoginModule();
    this.guestModule = new GuestModule();

    Nav.setLogoutCallback(() => {
      alert('not working yet');
    });
    this.render();
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      this.inner.show();
    } else {
      this.inner.hide();
    }
  }

  private proceed = (next: (c: Credentials, sc: SpinnerClient) => void): void => {
    const artichokeServer = String($(`#${Page.artichokeFormId}`).val());
    const authServer = String($(`#${Page.authFormId}`).val());

    if (artichokeServer && authServer) {
      this.credentials.setServers(artichokeServer, authServer);
      this.spinnerClient = new SpinnerClient(`${authServer}/api`);
      this.toggleVisible(false);
      next(this.credentials, this.spinnerClient);
    } else {
      alert('Empty servers inputs');
    }
  }

  private render = (): void => {
    const form = makeServersForm(Page.artichokeFormId, Page.authFormId);
    const existingButton = makeButton('btn-info', 'CONTINUE AS EXISTING USER', () => {
      this.proceed(this.loginModule.init);
    });
    const guestButton = makeButton('btn-info', 'CONTINUE AS GUEST', () => {
      this.proceed(this.guestModule.init);
    });

    const btnsDiv = makeDiv().prop({
      class: 'd-flex justify-content-center align-items-center m-3'
    }).append([existingButton, guestButton]);
    this.inner = makeDiv().append([form, btnsDiv]);
    Page.contents.empty();
    Page.contents.append(this.inner);
  }

}
