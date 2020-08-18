// tslint:disable:no-floating-promises
// tslint:disable:no-any

import * as RatelSdk from '../../../';
import { Logger } from '../logger';
import { makeDiv, makeInputWithBtn, makeChatBox } from '../view';
import { Page } from '../page';
import { ChatService } from './chat.service';

export class ChatModule {
  private inner: JQuery;
  private textBox: JQuery;

  private chatService: ChatService;

  constructor (session: RatelSdk.Session) {
    this.chatService = new ChatService(session);
  }

  public init = (): void => {
    this.render();
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      this.inner.show();
    }
    else {
      this.inner.hide();
    }
  }

  private textBoxAppend = (value: string): void => {
    this.textBox.append(`${value}\n`);
  }
  private textBoxEmpty = (): void => {
    this.textBox.empty();
  }

  private roomCallback = async (inputValue: string): Promise<any> => {
    this.textBoxEmpty();
    try {
      const history = await this.chatService.getRoomMessageHistory(inputValue);
      history.forEach(message => {
        this.textBoxAppend(message);
      });
    } catch (e) {
      Logger.error(e);
    }
  }

  private sendCallback = (inputValue: string): void => {
    if (!this.chatService.room) {
      alert('Not connected to any room');
    } else {
      this.chatService.sendMessage(inputValue);
    }
  }

  private render = (): void => {
    this.textBox = makeChatBox();

    const input = makeInputWithBtn('chat-input', this.roomCallback, 'Room id:', 'Get room messages', '', '');
    const msgInput = makeInputWithBtn('msg-input', this.sendCallback, 'Message:', 'Send', '', '');

    this.inner = makeDiv().append([input, this.textBox, msgInput]);
    Page.contents.append(this.inner);
  }
}
