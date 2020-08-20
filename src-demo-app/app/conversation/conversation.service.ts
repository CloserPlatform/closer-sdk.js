import * as RatelSdk from '../../../';
import { Logger } from '../logger';

export class ConversationService {
  private static readonly retrieveMessagesCount = 20;

  public room: RatelSdk.Room;

  constructor(public session: RatelSdk.Session) { }

  public setMessageCallback = (f: (m: RatelSdk.roomEvents.MessageSent) => void): void => {
    this.room.message$.subscribe(f);
  }

  public setTypingCallback = (f: (t: RatelSdk.roomEvents.TypingSent) => void): void => {
    this.room.typing$.subscribe(f);
  }

  public setRoom = async (roomId: string): Promise<void> => {
    const room = await this.session.chat.getRoom(roomId);
    this.room = room;
  }

  public getRoomMessageHistory = async (): Promise<ReadonlyArray<string>> => {
    try {
      const filter: RatelSdk.protocol.HistoryFilter = {
        filter: [RatelSdk.roomEvents.MessageSent.tag],
        customFilter: []
      };
      const messages = await this.room.getLatestMessages(ConversationService.retrieveMessagesCount, filter);

      return messages.items.map((item: RatelSdk.roomEvents.MessageSent) => item.message);
    } catch (e) {
      Logger.error(e);
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
