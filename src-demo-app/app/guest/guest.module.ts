import { SpinnerClient } from '@swagger/spinner';
import { makeInputWithBtn, makeDiv } from '../view';
import { Page } from '../page';
import { GuestService } from './guest.service';
import { Credentials } from '../credentials';
import { Logger } from '../logger';
import { ConversationModule } from '../conversation/conversation.module';

export class GuestModule {
  private inner: JQuery;
  private guestService: GuestService;
  private credentials: Credentials;
  private conversationModule = new ConversationModule();

  public init = async (credentials: Credentials, sc: SpinnerClient): Promise<void> => {
    this.guestService = new GuestService(sc);
    this.credentials = credentials;

    if (this.credentials.isGuestSessionSaved()) {
      this.guestService.spinnerClient.apiKey = this.credentials.apiKey;
      await this.orgCallback(this.credentials.orgId, false);
    } else {
      this.renderInputs();
    }
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      this.inner.show();
      this.conversationModule.toggleVisible();
    }
    else {
      this.conversationModule.toggleVisible(false);
      this.inner.hide();
    }
  }

  private orgCallback = async (orgId: string, newSession = true): Promise<void> => {
    try {
      if (!newSession) {
        const {session, roomId} = await this.guestService.getExistingGuestSession(this.credentials);
        Page.contents.empty();
        await this.conversationModule.init(roomId, session);
      } else {
        const {leadCtx, session} = await this.guestService.getNewGuestSession(orgId, this.credentials);
        this.credentials.setGuestCtx(leadCtx.id, leadCtx.orgId, leadCtx.apiKey);
        Page.contents.empty();
        await this.conversationModule.init(leadCtx.roomId, session);
      }
    } catch (e) {
      Logger.error(e);
    }
  }

  private renderInputs = (): void => {
    const orgInput = makeInputWithBtn(Page.orgInputId, this.orgCallback, 'Get org guest profile', 'Org id...', '');

    this.inner = makeDiv().append(orgInput);

    Page.contents.empty();
    Page.contents.append(this.inner);
  }
}
