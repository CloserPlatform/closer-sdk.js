import { Session, Room, roomEvents, protocol } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { SpinnerClient } from '@swagger/spinner';
import { Subscription } from 'rxjs';

export class ConversationService {
  private static readonly retrieveMessagesCount = 20;

  public room: Room;
  private subscriptions = new Array<Subscription>();

  constructor(public session: Session, public spinnerClient: SpinnerClient) { }

  public setMessageCallback = (f: (m: roomEvents.MessageSent) => void): void => {
    this.room.message$.subscribe(f);
  }

  public setTypingCallback = (f: (t: roomEvents.TypingSent) => void): void => {
    const subscription = this.room.typing$.subscribe(f);
    this.subscriptions.push(subscription);
  }

  public setDelieveredCallback = (f: (d: roomEvents.MessageDelivered) => void): void => {
    const subscription = this.room.messageDelivered$.subscribe(f);
    this.subscriptions.push(subscription);
  }

  public setMarkedCallback = (f: (m: roomEvents.MarkSent) => void): void => {
    const subscription = this.room.marked$.subscribe(f);
    this.subscriptions.push(subscription);
  }

  public setRoom = async (roomId: string): Promise<void> => {
    const room = await this.session.artichoke.getRoom(roomId);

    this.room = room;
  }

  public indicateTyping = (): void => {
    this.room.indicateTyping();
  }

  public setMark = (): void => {
    this.room.setMark(Date.now());
  }

  public setDelievered = (msgId: string): void => {
    this.room.setDelivered(msgId);
  }

  public unsubscribeEvents = (): void => {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());

    this.subscriptions = [];
  }

  public getRoomMessageHistory = async (): Promise<protocol.Paginated<roomEvents.RoomEvent> | void> => {
    try {
      const filter: protocol.HistoryFilter = {
        filter: [roomEvents.MessageSent.tag],
        customFilter: []
      };
      const messages = await this.room.getLatestMessages(ConversationService.retrieveMessagesCount, filter);

      return messages;
    } catch (e) {
      Logger.error(e);
    }
  }

  public sendMessage = (msg: string): void => {
    if (this.room) {
      this.room.send(msg).subscribe(
        res => Logger.log('Message response', res),
        e => Logger.error(e)
      );
    } else {
      alert('No Room');
    }
  }
}
