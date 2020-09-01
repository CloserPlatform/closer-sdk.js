import { roomEvents, protocol, Room } from '@closerplatform/closer-sdk';

export interface MessageHandle {
  readonly authorId: protocol.ID;
  readonly messageId: protocol.ID;
  readonly text: string;
}

export const createMessageHandle = (message: roomEvents.MessageSent): MessageHandle => {
  return {
    authorId: message.authorId,
    messageId: message.messageId,
    text: message.message
  };
};

export const getRoomMessageHistory = async (room: Room, nMessagesToRetrieve = 25):
  Promise<protocol.Paginated<roomEvents.MessageSent>> => {
    const filter: protocol.HistoryFilter = {
      filter: [roomEvents.MessageSent.tag],
      customFilter: []
    };
    const messages = await room.getLatestMessages(nMessagesToRetrieve, filter);

    return messages as protocol.Paginated<roomEvents.MessageSent>;
};

export const sendMessage = async (message: string, room: Room): Promise<void> => {
  try {
    await room.send(message).toPromise();
  } catch (e) {
    console.error('Error sending message: ', e);
  }
};
