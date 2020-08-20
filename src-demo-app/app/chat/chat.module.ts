// tslint:disable:no-floating-promises
// tslint:disable:no-any

import * as RatelSdk from '../../../';
import { Logger } from '../logger';
import { makeDiv, makeInputWithBtn, makeChatBox } from '../view';
import { Page } from '../page';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';

export class ChatModule {
  private inner: JQuery;

  private chatService: ChatService;
  private conversationModule: ConversationModule;

  constructor (session: RatelSdk.Session) {
    this.chatService = new ChatService(session);
    this.conversationModule = new ConversationModule();
  }

  public init = (): void => {
    this.render();
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      this.inner.show();
      this.conversationModule.toggleVisible();
    }
    else {
      this.inner.hide();
      this.conversationModule.toggleVisible(false);
    }
  }

  private roomCallback = async (inputValue: string): Promise<any> => {
    try {
      this.conversationModule.init(inputValue, this.chatService.session);
    } catch (e) {
      Logger.error(e);
    }
  }

  private render = (): void => {
    const input = makeInputWithBtn(Page.roomInputId, this.roomCallback, 'Connect to room', 'Room id...');

    this.inner = makeDiv().append(input);
    Page.contents.append(this.inner);
  }
}
