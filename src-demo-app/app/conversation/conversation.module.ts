// tslint:disable:no-any

import * as RatelSdk from '../../../';
import { makeChatBox, makeInputWithBtn, makeDiv } from'../view';
import { Page } from '../page';
import { ConversationService } from './conversation.service';
import { Logger } from '../logger';

export class ConversationModule {
  private static readonly INFO_TIME = 3000;

  private textBox: JQuery;
  private infoText: JQuery;
  private inner: JQuery;

  private infoTimeout: any;
  private conversationService: ConversationService;

  public init = async (roomId: string, session: RatelSdk.Session): Promise<any> => {
    this.conversationService = new ConversationService(session);
    await this.conversationService.setRoom(roomId);
    this.conversationService.setMessageCallback(this.handleMessageCallback);
    this.conversationService.setTypingCallback(this.handleTypingCallback);

    this.render();
    await this.refreehTextBox();
  }
  public toggleVisible = (visible = true): void => {
    if (visible) {
      this.inner.show();
    } else {
      this.inner.hide();
    }
  }

  private handleMessageCallback = (msg: RatelSdk.roomEvents.MessageSent): void => {
    const ctx = JSON.stringify(msg.context);
    this.textBoxAppend(msg.message);
    if (ctx !== '{}') {
      this.textBox.append(ctx);
    }
  }

  private handleTypingCallback = (ts: RatelSdk.roomEvents.TypingSent): void => {
    this.infoText.empty();
    this.infoText.append('<small class="text-primary">User is typing...</small>');

    clearTimeout(this.infoTimeout);
    this.infoTimeout = setTimeout(this.clearInfoText, ConversationModule.INFO_TIME);
  }

  private clearInfoText = (): void => {
    this.infoText.empty();
  }

  private refreehTextBox = async (): Promise<any> => {
    const history = await this.conversationService.getRoomMessageHistory();
    this.textBoxEmpty();
    history.forEach(message => {
      this.textBoxAppend(message);
    });
  }

  private textBoxAppend = (value: string): void => {
    this.textBox.append(`${value}\n`);
  }
  private textBoxEmpty = (): void => {
    this.textBox.empty();
  }

  private render = (): void => {
    this.textBox = makeChatBox();

    const msgInput = makeInputWithBtn(Page.msgInputId, this.sendCallback, 'Send', 'Type your message here...');
    this.infoText = makeDiv().prop({
      class: 'mb-3'
    });

    this.inner = makeDiv().append([this.textBox, msgInput, this.infoText]);
    Page.contents.append(this.inner);
  }

  private sendCallback = async (inputValue: string): Promise<any> => {
    if (!this.conversationService.room) {
      alert('Not connected to any room');
    } else {
      await this.conversationService.sendMessage(inputValue);
      $(`#${Page.msgInputInnerId}`).val('');
    }
  }
}
