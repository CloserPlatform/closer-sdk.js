import { SpinnerClient } from '@swagger/spinner';
import { makeButton, makeServersForm, makeDiv } from '../view';
import { Page } from '../page';
import { Nav } from '../nav';
import { LoginModule } from '../login/login.module';
import { GuestModule } from '../guest/guest.module';
import { Credentials } from '../credentials';

export class EntryModule {
  private loginModule = new LoginModule();
  private guestModule = new GuestModule();
  private credentials = new Credentials();
  private spinnerClient: SpinnerClient;

  private inner: JQuery;

  public init = (): void => {
    Nav.setLogoutCallback(() => {
      this.credentials.clear();
      location.reload();
    });

    if (!this.credentials.areServersSaved()) {
      this.render();
    } else {
      if (this.credentials.isGuest) {
        this.proceed(this.guestModule.init);
      } else {
        this.proceed(this.loginModule.init);
      }
    }
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      this.inner.show();
    } else {
      this.inner.hide();
    }
  }

  private proceed = (next: (c: Credentials, sc: SpinnerClient) => void): void => {
    this.spinnerClient = new SpinnerClient(`${this.credentials.authServer}/api`);
    next(this.credentials, this.spinnerClient);
  }

  private buttonsCallback = (next: (c: Credentials, sc: SpinnerClient) => void): void => {
    const artichokeServer = String($(`#${Page.artichokeFormId}`).val());
    const authServer = String($(`#${Page.authFormId}`).val());

    if (artichokeServer && authServer) {
      this.credentials.setServers(artichokeServer, authServer);
      this.toggleVisible(false);
      this.proceed(next);
    } else {
      alert('Empty servers inputs');
    }
  }

  private render = (): void => {
    const form = makeServersForm(Page.artichokeFormId, Page.authFormId);
    const existingButton = makeButton('btn-info', 'CONTINUE AS EXISTING USER', () => {
      this.buttonsCallback(this.loginModule.init);
    });
    const guestButton = makeButton('btn-info', 'CONTINUE AS GUEST', () => {
      this.buttonsCallback(this.guestModule.init);
    });

    const buttonsContainer = makeDiv().prop({
      class: 'd-flex justify-content-center align-items-center m-3'
    }).append([existingButton, guestButton]);

    this.inner = makeDiv().append([form, buttonsContainer]);

    Page.contents.empty();
    Page.contents.append(this.inner);
  }

}
