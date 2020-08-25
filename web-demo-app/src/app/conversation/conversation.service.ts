import { Session, Room, roomEvents, protocol } from '@closerplatform/closer-sdk';
import { Logger } from '../logger';
import { SpinnerClient } from '@swagger/spinner';

export class ConversationService {
  private static readonly retrieveMessagesCount = 20;

  public room: Room;

  constructor(public session: Session, public spinnerClient: SpinnerClient) { }

  public setRoom = async (roomId: string): Promise<void> => {
    const room = await this.session.artichoke.getRoom(roomId);

    this.room = room;
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
