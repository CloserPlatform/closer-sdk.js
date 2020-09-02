import { roomEvents, protocol, Room } from '@closerplatform/closer-sdk';

export enum MessageStatus { Undelievered, Delievered, Viewed, Opposite }

export interface MessageHandle {
  readonly authorId: protocol.ID;
  readonly messageId: protocol.ID;
  readonly text: string;
  readonly status: MessageStatus;
}

export const createMessageHandle = (message: roomEvents.MessageSent, status: MessageStatus): MessageHandle => ({
  authorId: message.authorId,
  messageId: message.messageId,
  text: message.message,
  status
});

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
  await room.send(message).toPromise();
};

export const getMessagesWithStatusUpdate = (id: protocol.ID, msgs: readonly MessageHandle[], status: MessageStatus)
: readonly MessageHandle[] => {
  return msgs.map(mh => {
    return (mh.authorId !== id || mh.status === MessageStatus.Viewed) ? mh : { ...mh, status };
  });
};
