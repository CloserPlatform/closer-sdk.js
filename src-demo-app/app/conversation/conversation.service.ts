import { Session, Room, roomEvents, protocol } from '../../../';
import { Logger } from '../logger';

export class ConversationService {
  private static readonly retrieveMessagesCount = 20;

  public room: Room;

  constructor(public session: Session) { }

  public setMessageCallback = (f: (m: roomEvents.MessageSent) => void): void => {
    this.room.message$.subscribe(f);
  }

  public setTypingCallback = (f: (t: roomEvents.TypingSent) => void): void => {
    this.room.typing$.subscribe(f);
  }

  public setDelieveredCallback = (f: (d: roomEvents.MessageDelivered) => void): void => {
    this.room.messageDelivered$.subscribe(f);
  }

  public setMarkedCallback = (f: (m: roomEvents.MarkSent) => void): void => {
    this.room.marked$.subscribe(f);
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
