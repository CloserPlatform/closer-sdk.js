// tslint:disable:no-floating-promises

import { Session } from 'closer-sdk-js';
import { Logger } from '../logger';
import { makeDiv, makeInputWithBtn } from '../view';
import { Page } from '../page';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { Credentials } from '../credentials';

export class ChatModule {
  private inner: JQuery;

  private chatService: ChatService;
  private conversationModule: ConversationModule;

  constructor (private credentials: Credentials, session: Session) {
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

  private roomCallback = async (inputValue: string): Promise<void> => {
    try {
      await this.conversationModule.init(inputValue, this.chatService.session, this.credentials);
      this.credentials.setRoom(inputValue);
    } catch (e) {
      Logger.error(e);
    }
  }

  private render = (): void => {
    const input = makeInputWithBtn(Page.roomInputId, this.roomCallback,
      'Connect to room', 'Room id...', this.credentials.roomId || '');

    this.inner = makeDiv().append(input);
    Page.contents.append(this.inner);
  }
}
