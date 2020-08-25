// tslint:disable:readonly-array

import { Session, roomEvents } from '@closerplatform/closer-sdk';
import { makeChatContainer, makeInputWithBtn, makeDiv, makeMessageEntry, makeChatWrapper } from'../view';
import { Page } from '../page';
import { ConversationService } from './conversation.service';
import { Credentials } from '../credentials';
import { SpinnerClient } from '@swagger/spinner';
import { BoardModule, ModuleNames } from '../board/board.module';

interface MessageHandle {
  messageId: string;
  authorId: string;
  elem: JQuery;
}

enum MessageColors {
  undelievered = 'border-warning',
  delievered = 'border-success',
  opposite = 'border-secondary',
  read = 'border-info'
}

export class ConversationModule {
  private static readonly INFO_TIME = 2000;
  private static readonly SCROLL_TIME = 200;
  public readonly NAME = ModuleNames.conversation;

  private chatContainer: JQuery;
  private chatWrapper: JQuery;
  private infoContainer: JQuery;
  private inner: JQuery;
  private messages: MessageHandle[];

  private infoTimeout: ReturnType<typeof setTimeout>;
  private conversationService: ConversationService;

  constructor (private boardModule: BoardModule, private credentials: Credentials, private roomId: string) { }

  public init = async (session: Session, spinnerClient: SpinnerClient): Promise<void> => {
    this.conversationService = new ConversationService(session, spinnerClient);
    await this.conversationService.setRoom(this.roomId);

    this.conversationService.setMessageCallback(this.handleMessageCallback);
    this.conversationService.setTypingCallback(this.handleTypingCallback);
    this.conversationService.setDelieveredCallback(this.handleDelieveredCallback);
    this.conversationService.setMarkedCallback(this.handleMarkedCallback);

    window.addEventListener('focus', () => {
      this.conversationService.setMark();
    });

    this.render();
    await this.refreehTextBox();
    Page.contents.append(this.inner);

    this.scrollToBottom();
  }

  public toggleVisible = (visible = true): void => {
    if (visible) {
      if (this.inner) {
        this.inner.show();
      }
    } else {
      if (this.inner) {
        this.inner.hide();
      }
    }
  }

  private scrollToBottom = (): void => {
    this.chatWrapper.animate({ scrollTop: this.chatWrapper.get(0).scrollHeight }, ConversationModule.SCROLL_TIME);
  }

  private handleMessageCallback = (msg: roomEvents.MessageSent): void => {
    const ctx = JSON.stringify(msg.context);
    this.textBoxAppend(msg);
    if (ctx !== '{}') {
      this.chatContainer.append(ctx);
    }

    this.scrollToBottom();

    if (msg.authorId !== this.credentials.id) {
      this.conversationService.setDelievered(msg.messageId);
      this.infoContainer.empty();
      clearTimeout(this.infoTimeout);
    }
  }

  private handleTypingCallback = (): void => {
    this.setInfoText('User is typing...');

    clearTimeout(this.infoTimeout);
    this.infoTimeout = setTimeout(this.setInfoText, ConversationModule.INFO_TIME);
  }

  private handleDelieveredCallback = (message: roomEvents.MessageDelivered): void => {
    const messageHandle = this.messages.find(m => m.messageId === message.messageId);
    if (messageHandle) {
      messageHandle.elem.removeClass(MessageColors.undelievered).addClass(MessageColors.delievered);
    }
  }

  private handleMarkedCallback = (mark: roomEvents.MarkSent): void => {
    if (mark.authorId === this.credentials.id) {
      return;
    }

    this.messages.filter(mh => mh.authorId === this.credentials.id).forEach(mh => {
      mh.elem
      .removeClass([MessageColors.delievered, MessageColors.undelievered])
      .addClass(MessageColors.read);
    });
  }

  private setInfoText = (text: string | undefined = undefined): void => {
    this.infoContainer.empty();
    if (text) {
      this.infoContainer.append(`<small class="text-muted">${text}</small>`);
    }
    this.scrollToBottom();
  }

  private refreehTextBox = async (): Promise<void> => {
    this.messages = [];
    const history = await this.conversationService.getRoomMessageHistory();

    this.textBoxEmpty();
    if (history) {
      history.items.forEach(message => {
        this.textBoxAppend(message as roomEvents.MessageSent, false);
      });
    }
  }

  private textBoxAppend = (message: roomEvents.MessageSent, isNewMessage = true): void => {
    if (message.message) {
      const isAuthor = message.authorId === this.credentials.id;

      const color = isAuthor ?
      `${isNewMessage ? MessageColors.undelievered : MessageColors.read}` :
      MessageColors.opposite;

      const position = isAuthor ? 'align-self-end' : 'align-self-start';
      const border = isAuthor ? 'border-right' : 'border-left';

      const messageEntry = makeMessageEntry(message.message, [position, border, color], this.switchToCallingModule);
      this.messages.push({
        messageId: message.messageId,
        authorId: message.authorId,
        elem: messageEntry
      });
      this.chatContainer.append(messageEntry);
    }
  }
  private textBoxEmpty = (): void => {
    this.chatContainer.empty();
  }

  private switchToCallingModule = (messageDiv: JQuery): void => {
    const messageHandle = this.messages.find(m => m.elem === messageDiv);

    if (messageHandle) {
      if (messageHandle.authorId === this.credentials.id) {
        alert('You are trying to call yourself');
      } else {
        this.credentials.setCallee(messageHandle.authorId);
        this.boardModule.switch(ModuleNames.call);
      }
    }
  }

  private render = (): void => {
    this.chatWrapper = makeChatWrapper();
    this.chatContainer = makeChatContainer();
    this.infoContainer = makeDiv().prop({
      class: 'my-2 align-self-center'
    });

    this.chatWrapper.append([this.chatContainer, this.infoContainer]);

    const legend = makeDiv().prop({
      class: 'd-flex justify-content-center my-3'
    }).append([
      makeMessageEntry('Others\' message', ['border-left', MessageColors.opposite]),
      makeMessageEntry('Not delievered', ['border-right', MessageColors.undelievered]),
      makeMessageEntry('Delievered', ['border-right', MessageColors.delievered]),
      makeMessageEntry('Read', ['border-right', MessageColors.read])
    ]);
    const info = makeDiv().prop({
      class: 'text-muted text-center'
    }).append('Click on message to call its author');

    const msgInput = makeInputWithBtn(Page.msgInputId, this.sendCallback, 'Send',
      'Type your message here...', '', this.conversationService.indicateTyping);

    this.inner = makeDiv().append([info, legend, this.chatWrapper, msgInput]);
  }

  private sendCallback = (inputValue: string): void => {
    if (!this.conversationService.room) {
      alert('Not connected to any room');
    } else {
      this.conversationService.sendMessage(inputValue);
      $(`#${Page.msgInputInnerId}`).val('');
    }
  }
}
