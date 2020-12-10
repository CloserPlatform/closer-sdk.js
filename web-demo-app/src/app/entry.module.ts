import { makeButton, makeServersForm, makeDiv, makeInput } from './view';
import { Page } from './page';
import { Nav } from './nav';
import { GuestModule } from './guest/guest.module';
import { Storage, EntryInputs, SessionDetails } from './storage';
import { CloserSDK, GuestSession, UserConfig } from '@closerplatform/closer-sdk';
import { Logger } from './logger';
import { CloserGuestSessionService } from './conversation/closer-session.service';

export class EntryModule {

  constructor(
    private storage: Storage,
  ) {
  }

  public init(): void {
    Nav.setLogoutCallback(() => {
      this.storage.clear();
      location.reload();
    });

    const maybeEntryinputs = this.storage.getEntryInputs();
    const maybeSession = this.storage.getSessionDetails();

    if (maybeEntryinputs && maybeSession) {
      this.initializeExistingGuestSession(maybeEntryinputs, maybeSession).catch(err => {
        alert('Could not use cached session data');
        Logger.error(err);
        Logger.log('Removing previous session');
        this.storage.setSessionDetails();
        Logger.log('Rendering inputs');
        this.handleNewVisitor(maybeEntryinputs);
      });
    } else {
      this.handleNewVisitor(maybeEntryinputs);
    }
  }

  private handleNewVisitor(maybeEntryinputs?: EntryInputs): void {
    const entryinputs = maybeEntryinputs || {
      spinner: 'https://spinner.closer.app',
      artichoke: 'https://artichoke.closer.app',
      orgId: '30302126-5a04-465c-b074-2628a35dfe43'
    };

    return this.render(entryinputs);
  }

  private render(entryinputs: EntryInputs): void {
    const serversForm = makeServersForm(Page.artichokeFormId, Page.authFormId, entryinputs);
    const orgInput = makeInput(
      Page.orgIdFormId,
      'Get org guest profile',
      'Org id...',
      entryinputs.orgId
    );
    const guestButton = makeButton('btn-info mx-2', 'CONTINUE AS GUEST', () => this.guestLoginCallback());

    const buttonsContainer = makeDiv().prop({
      class: 'd-flex justify-content-center align-items-center m-3'
    }).append([guestButton]);

    Page.contents.append(
      makeDiv().append([serversForm, orgInput, buttonsContainer])
    );
  }

  private guestLoginCallback(): void {
    const entryInputs = this.getEntryInputs();
    if (entryInputs) {
      this.initializeNewGuestSession(entryInputs);
    } else {
      return alert('Empty entry inputs, fill all and try again');
    }
  }

  private initializeNewGuestSession(entryInputs: EntryInputs): void {
    const orgId = entryInputs.orgId;
    this.storage.setEntryInputs(entryInputs);

    this.getCloserSDK(entryInputs).createGuestSession(orgId).then(
      guestSession => {
        const { id, apiKey, roomId } = guestSession;
        this.storage.setSessionDetails({ id, apiKey, roomId, orgId });

        this.getGuestModule(guestSession).init();
      },
      _ => alert('Could not create guest session, check orgId.')
    );
  }

  // tslint:disable-next-line:cyclomatic-complexity
  private getEntryInputs(): EntryInputs | undefined {
    const artichoke = String($(`#${Page.artichokeFormId}`).val());
    const spinner = String($(`#${Page.authFormId}`).val());
    const orgId = String($(`#${Page.orgIdFormId}`).val());

    if (artichoke && spinner && orgId) {
      return { artichoke, spinner, orgId };
    } else {
      return undefined;
    }
  }

  private getCloserSDK(servers: EntryInputs): CloserSDK {
    const userConfig: UserConfig = {
      logLevel: 0,
      spinner: { server: servers.spinner },
      artichoke: { server: servers.artichoke, fallbackReconnectDelayMs: 3000 }
    };

    return CloserSDK.init(userConfig);
  }

  private async initializeExistingGuestSession(
    servers: EntryInputs,
    sessionDetails: SessionDetails,
  ): Promise<void> {
    const guestSession = await this.getCloserSDK(servers).getGuestSession(
      sessionDetails.orgId,
      sessionDetails.id,
      sessionDetails.apiKey
    );

    return this.getGuestModule(guestSession).init();
  }

  private getGuestModule(guestSession: GuestSession): GuestModule {
    return new GuestModule(
      new CloserGuestSessionService(guestSession)
    );
  }
}
