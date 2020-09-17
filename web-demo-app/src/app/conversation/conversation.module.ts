import { roomEvents, Room, protocol } from '@closerplatform/closer-sdk';
import {
  makeChatContainer, makeInputWithBtn, makeMessageEntry,
  makeChatWrapper, makeChatLegend, makeChatInfoText, makeChatEventInfoContainer, makeDiv, makeSplitGridRow, makeCallbox
} from '../view';
import { Page } from '../page';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Logger } from '../logger';
import { createStream } from './stream';
import { CallHandler } from './call-handler';
import { CloserGuestSessionService } from './closer-session.service';

interface MessageHandle {
  readonly messageId: string;
  readonly authorId: string;
  readonly elem: JQuery;
}

export enum MessageColors {
  undelievered = 'border-warning',
  delievered = 'border-success',
  opposite = 'border-secondary',
  read = 'border-info'
}

export class ConversationModule {
  private static readonly INFO_TIME = 2000;
  private static readonly SCROLL_TIME = 200;
  private static readonly retrieveMessagesCount = 20;

  private readonly unsubscribeEvent = new Subject<void>();

  private chatContainer: JQuery;
  private chatWrapper: JQuery;
  private eventInfoContainer: JQuery;
  private messages: MessageHandle[];

  private infoTimeout: ReturnType<typeof setTimeout>;

  constructor(
    private html: JQuery,
    private closerSessionService: CloserGuestSessionService,
    private room: Room,
  ) {
  }

  public init(): void {
    this.render();
  }

  public hide(): void {
    this.unsubscribeEvent.next();
    window.removeEventListener('focus', () => this.setMark());
    this.html.off('click');
  }

  private async callToUser(calleeId: string): Promise<void> {
    const stream = await createStream();

    const tracks = stream.getTracks();

    try {
      const call = await this.closerSessionService.createCall(calleeId);
      Logger.log('Created direct call');

      const callbox = makeCallbox(call.id, 'callbox', []);
      const callboxGridRow = makeSplitGridRow();

      const callHandler = new CallHandler(
        makeDiv(),
        callbox,
        callboxGridRow,
        call,
        tracks,
        () => this.closerSessionService.disconnect(),
      );
      callHandler.init();
    } catch (e) {
      alert(`Failed at creating call - ${e}`);
    }
  }

  private show(): void {
    this.initializeTextBox();
    this.subscribeChatEvents();
    window.addEventListener('focus', () => this.setMark());
    if (this.html) {
      this.html.on('click', () => this.setMark());
    }
  }

  private subscribeChatEvents(): void {
    this.room.message$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(msg => this.handleMessageSentEvent(msg));

    this.room.typing$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((typingSent) => this.handleTyping(typingSent));

    this.room.messageDelivered$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(delivered => this.handleDelievered(delivered));

    this.room.marked$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(mark => this.handleMarked(mark));
  }

  private get unsubscribe$(): Observable<void> {
    return this.unsubscribeEvent.asObservable();
  }

  private scrollToBottom(): void {
    this.chatWrapper.animate({ scrollTop: this.chatWrapper.get(0).scrollHeight }, ConversationModule.SCROLL_TIME);
  }

  private setMark(): void {
    this.room.setMark(Date.now());
  }

  private handleMessageSentEvent(msg: roomEvents.MessageSent): void {
    const ctx = JSON.stringify(msg.context);
    this.textBoxAppend(msg, this.getMessageColor(msg, true));
    if (ctx !== '{}') {
      this.chatContainer.append(ctx);
    }

    this.scrollToBottom();

    if (msg.authorId !== this.closerSessionService.id) {
      this.room.setDelivered(msg.messageId);
      this.eventInfoContainer.empty();
      clearTimeout(this.infoTimeout);
    }
  }

  private handleTyping(typingSent: roomEvents.TypingSent): void {
    this.setInfoText(typingSent.preview ? `User is typing...[${typingSent.preview}]` : 'User is typing...');

    clearTimeout(this.infoTimeout);
    if (!typingSent.preview) {
      this.infoTimeout = setTimeout(() => this.setInfoText(), ConversationModule.INFO_TIME);
    }
  }

  private handleDelievered(message: roomEvents.MessageDelivered): void {
    const messageHandle = this.messages.find(m => m.messageId === message.messageId);
    if (messageHandle) {
      messageHandle.elem.removeClass(MessageColors.undelievered).addClass(MessageColors.delievered);
    }
  }

  private handleMarked(mark: roomEvents.MarkSent): void {
    if (mark.authorId !== this.closerSessionService.id) {
      this.messages.filter(mh => mh.authorId === this.closerSessionService.id).forEach(mh => {
        mh.elem
          .removeClass([MessageColors.delievered, MessageColors.undelievered])
          .addClass(MessageColors.read);
      });
    }
  }

  private setInfoText(text?: string): void {
    this.eventInfoContainer.empty();
    if (text) {
      this.eventInfoContainer.append(`<small class="text-muted">${text}</small>`);
    }
    this.scrollToBottom();
  }

  private async initializeTextBox(): Promise<void> {
    this.messages = [];
    const history = await this.getRoomMessageHistory();

    this.chatContainer.empty();
    if (history) {
      history.items.filter(roomEvents.MessageSent.isMessageSent).forEach(message => {
        this.textBoxAppend(message, this.getMessageColor(message, false));
      });
    }
  }

  private isMessageAuthor(message: roomEvents.MessageSent): boolean {
    return message.authorId === this.closerSessionService.id;
  }

  private getMessageColor(message: roomEvents.MessageSent, isNewMessage = true): string {
    return this.isMessageAuthor(message) ?
      `${isNewMessage ? MessageColors.undelievered : MessageColors.read}` :
      MessageColors.opposite;
  }

  private textBoxAppend(message: roomEvents.MessageSent, color: string): void {
    const isAuthor = this.isMessageAuthor(message);

    const position = isAuthor ? 'align-self-end' : 'align-self-start';
    const border = isAuthor ? 'border-right' : 'border-left';

    const messageEntry = makeMessageEntry(
      message.message,
      [position, border, color],
      div => this.handleCallButton(div)
    );

    this.messages.push({
      messageId: message.messageId,
      authorId: message.authorId,
      elem: messageEntry
    });

    this.chatContainer.append(messageEntry);
  }

  private handleCallButton(messageDiv: JQuery): void {
    const messageHandle = this.messages.find(m => m.elem === messageDiv);

    if (messageHandle) {
      if (messageHandle.authorId === this.closerSessionService.id) {
        alert('You are trying to call yourself');
      } else {
        this.callToUser(messageHandle.authorId);
      }
    }
  }

  private sendButtonCallback(message: string): void {
    this.room.send(message).subscribe(
      res => Logger.log('Message response', res),
      e => Logger.error(e)
    );
    $(`#${Page.msgInputInnerId}`).val('');
  }

  private async getRoomMessageHistory(): Promise<protocol.Paginated<roomEvents.RoomEvent>> {
    const filter: protocol.HistoryFilter = {
      filter: [roomEvents.MessageSent.tag],
      customFilter: []
    };
    const messages = await this.room.getLatestMessages(ConversationModule.retrieveMessagesCount, filter);

    return messages;
  }

  private render(): void {
    Page.contents.empty();
    this.chatWrapper = makeChatWrapper();
    this.chatContainer = makeChatContainer();
    this.eventInfoContainer = makeChatEventInfoContainer();

    this.chatWrapper.append([this.chatContainer, this.eventInfoContainer]);

    const legend = makeChatLegend();
    const info = makeChatInfoText('Click on message to call its author');

    const msgInput = makeInputWithBtn(
      Page.msgInputId,
      msg => this.sendButtonCallback(msg),
      'Send',
      'Type your message here...',
      '',
      value => this.room.indicateTyping(value)
    );

    this.html.append([info, legend, this.chatWrapper, msgInput]);

    this.show();

    Page.contents.append(this.html);
    this.scrollToBottom();
  }
}
