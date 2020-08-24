// tslint:disable:no-floating-promises

import { Session } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { makeDiv, makeInputWithBtn } from '../view';
import { Page } from '../page';
import { ChatService } from './chat.service';
import { ConversationModule } from '../conversation/conversation.module';
import { Credentials } from '../credentials';

export class ChatModule {
  public readonly NAME = 'Chat module';
  private inner: JQuery;

  private chatService: ChatService;
  private conversationModule: ConversationModule;

  constructor (private credentials: Credentials, session: Session) {
    this.chatService = new ChatService(session);
  }

  public init = (): void => {
    this.render();
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      this.inner.show();
      if (this.conversationModule) {
        this.conversationModule.toggleVisible();
      }
    }
    else {
      this.inner.hide();
      if (this.conversationModule) {
        this.conversationModule.toggleVisible();
      }
    }
  }

  private roomCallback = async (inputValue: string): Promise<void> => {
    try {
      this.conversationModule = new ConversationModule(inputValue, this.chatService.session, this.credentials);
      await this.conversationModule.init();
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
