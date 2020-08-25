// tslint:disable:readonly-array

import { Session, roomEvents } from '@closerplatform/closer-sdk';
import { makeChatContainer, makeInputWithBtn, makeDiv, makeMessageEntry,
  makeChatWrapper, makeChatLegend, makeChatInfoText, makeChatEventInfoContainer } from'../view';
import { Page } from '../page';
import { ConversationService } from './conversation.service';
import { Credentials } from '../credentials';
import { SpinnerClient } from '@swagger/spinner';
import { BoardModule, ModuleNames } from '../board/board.module';
import { SubModule } from '../board/submodule';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface MessageHandle {
  messageId: string;
  authorId: string;
  elem: JQuery;
}

export enum MessageColors {
  undelievered = 'border-warning',
  delievered = 'border-success',
  opposite = 'border-secondary',
  read = 'border-info'
}

export class ConversationModule extends SubModule {
  private static readonly INFO_TIME = 2000;
  private static readonly SCROLL_TIME = 200;
  public readonly NAME = ModuleNames.conversation;

  private unsubscribeEvent = new Subject<void>();

  private chatContainer: JQuery;
  private chatWrapper: JQuery;
  private eventInfoContainer: JQuery;
  private messages: MessageHandle[];

  private infoTimeout: ReturnType<typeof setTimeout>;
  private conversationService: ConversationService;

  constructor (public boardModule: BoardModule, public credentials: Credentials, private roomId: string) {
    super(boardModule, credentials);
  }

  public init = async (session: Session, spinnerClient: SpinnerClient): Promise<void> => {
    this.conversationService = new ConversationService(session, spinnerClient);
    await this.conversationService.setRoom(this.roomId);

    await this.render();
  }

  protected onShow = async (): Promise<void> => {
    await this.refreehTextBox();
    this.subscribeChatEvents();
    window.addEventListener('focus', this.setMark);
    if (this.inner) {
      this.inner.on('click', this.setMark);
    }
  }

  protected onHide = async (): Promise<void> => {
    this.unsubscribeEvent.next();
    window.removeEventListener('focus', this.setMark);

    if (this.inner) {
      this.inner.off('click');
    }
  }

  private subscribeChatEvents = (): void => {
    this.conversationService.room.message$
    .pipe(takeUntil(this.unsubscribe$))
    .subscribe(this.handleMessage);

    this.conversationService.room.typing$
    .pipe(takeUntil(this.unsubscribe$))
    .subscribe(this.handleTyping);

    this.conversationService.room.messageDelivered$
    .pipe(takeUntil(this.unsubscribe$))
    .subscribe(this.handleDelievered);

    this.conversationService.room.marked$
    .pipe(takeUntil(this.unsubscribe$))
    .subscribe(this.handleMarked);
  }

  private get unsubscribe$(): Observable<void> {
    return this.unsubscribeEvent.asObservable();
  }

  private scrollToBottom = (): void => {
    this.chatWrapper.animate({ scrollTop: this.chatWrapper.get(0).scrollHeight }, ConversationModule.SCROLL_TIME);
  }

  private setMark = (): void => {
    this.conversationService.room.setMark(Date.now());
  }

  private handleMessage = (msg: roomEvents.MessageSent): void => {
    const ctx = JSON.stringify(msg.context);
    this.textBoxAppend(msg);
    if (ctx !== '{}') {
      this.chatContainer.append(ctx);
    }

    this.scrollToBottom();

    if (msg.authorId !== this.credentials.id) {
      this.conversationService.room.setDelivered(msg.messageId);
      this.eventInfoContainer.empty();
      clearTimeout(this.infoTimeout);
    }
  }

  private handleTyping = (): void => {
    this.setInfoText('User is typing...');

    clearTimeout(this.infoTimeout);
    this.infoTimeout = setTimeout(this.setInfoText, ConversationModule.INFO_TIME);
  }

  private handleDelievered = (message: roomEvents.MessageDelivered): void => {
    const messageHandle = this.messages.find(m => m.messageId === message.messageId);
    if (messageHandle) {
      messageHandle.elem.removeClass(MessageColors.undelievered).addClass(MessageColors.delievered);
    }
  }

  private handleMarked = (mark: roomEvents.MarkSent): void => {
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
    this.eventInfoContainer.empty();
    if (text) {
      this.eventInfoContainer.append(`<small class="text-muted">${text}</small>`);
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

  private switchToCallingModule = async (messageDiv: JQuery): Promise<void> => {
    const messageHandle = this.messages.find(m => m.elem === messageDiv);

    if (messageHandle) {
      if (messageHandle.authorId === this.credentials.id) {
        alert('You are trying to call yourself');
      } else {
        this.credentials.setCallee(messageHandle.authorId);
        await this.boardModule.switchTo(ModuleNames.call);
      }
    }
  }

  private indicateTyping = (): void => {
    this.conversationService.room.indicateTyping();
  }

  private sendButtonCallback = (inputValue: string): void => {
    if (!this.conversationService.room) {
      alert('Not connected to any room');
    } else {
      this.conversationService.sendMessage(inputValue);
      $(`#${Page.msgInputInnerId}`).val('');
    }
  }

  private render = async (): Promise<void> => {
    this.chatWrapper = makeChatWrapper();
    this.chatContainer = makeChatContainer();
    this.eventInfoContainer = makeChatEventInfoContainer();

    this.chatWrapper.append([this.chatContainer, this.eventInfoContainer]);

    const legend = makeChatLegend();
    const info = makeChatInfoText('Click on message to call its author');

    const msgInput = makeInputWithBtn(Page.msgInputId, this.sendButtonCallback, 'Send',
      'Type your message here...', '', this.indicateTyping);

    this.inner = makeDiv().append([info, legend, this.chatWrapper, msgInput]);

    await this.onShow();

    Page.contents.append(this.inner);
    this.scrollToBottom();
  }
}
