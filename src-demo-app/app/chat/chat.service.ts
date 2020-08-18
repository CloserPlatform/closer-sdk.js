// tslint:disable:no-any

import * as RatelSdk from '../../../';
import { Logger } from '../logger';

export class ChatService {
  private static readonly retrieveMessagesCount = 20;

  public room: RatelSdk.Room;

  constructor(public session: RatelSdk.Session) { }

  public setRoom = async (roomId: string): Promise<any> => {
    const room = await this.session.chat.getRoom(roomId);
    this.room = room;
  }

  public getRoomMessageHistory = async (roomId: string): Promise<ReadonlyArray<string>> => {
    try {
      await this.setRoom(roomId);
      const items = await this.room.getLatestMessages(ChatService.retrieveMessagesCount);

      return items.items
          .filter(item => RatelSdk.roomEvents.MessageSent.isMessageSent(item))
          .map((item: RatelSdk.roomEvents.MessageSent) => item.message);
    } catch (e) {
      Logger.error(e);
    }
  }

  public sendMessage = async (msg: string): Promise<any> => {
    if (this.room) {
      try {
        const response = await this.room.send(msg);
        Logger.log(response);
      } catch (e) {
        Logger.error(e);
      }
    }
  }
}
