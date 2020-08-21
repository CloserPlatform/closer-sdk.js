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

  public setRoom = async (roomId: string): Promise<void> => {
    const room = await this.session.artichoke.getRoom(roomId);
    this.room = room;
  }

  public getRoomMessageHistory = async (): Promise<ReadonlyArray<string>> => {
    try {
      const filter: protocol.HistoryFilter = {
        filter: [roomEvents.MessageSent.tag],
        customFilter: []
      };
      const messages = await this.room.getLatestMessages(ConversationService.retrieveMessagesCount, filter);

      return messages.items.map((item: roomEvents.MessageSent) => item.message);
    } catch (e) {
      Logger.error(e);

      return [];
    }
  }

  public sendMessage = async (msg: string): Promise<void> => {
    if (this.room) {
      try {
        const response = await this.room.send(msg);
        Logger.log('Message response', response);
      } catch (e) {
        Logger.error(e);
      }
    } else {
      alert('No Room');
    }
  }
}
