// tslint:disable:no-any

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
  private conversationModule: ConversationModule;

  public init = (credentials: Credentials, sc: SpinnerClient): void => {
    this.conversationModule = new ConversationModule();
    this.guestService = new GuestService(credentials, sc);
    this.credentials = credentials;
    this.renderInputs();
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

  private orgCallback = async (orgId: string): Promise<any> => {
    try {
      const {leadCtx, session} = await this.guestService.connectGuest(orgId, this.credentials);
      Page.contents.empty();
      await this.conversationModule.init(leadCtx.roomId, session);
    } catch (e) {
      Logger.error(e);
    }
  }

  private renderInputs = (): void => {
    const orgInput = makeInputWithBtn(Page.orgInputId, this.orgCallback, 'Get org guest profile', 'Org id...');

    this.inner = makeDiv().append(orgInput);

    Page.contents.empty();
    Page.contents.append(this.inner);
  }
}
