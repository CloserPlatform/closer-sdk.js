import { roomEvents, protocol, Room } from '@closerplatform/closer-sdk';

import { Props } from './chat';
import { useRef, useState, useEffect } from 'react';
import { ScrollView, Keyboard } from 'react-native';
import { Subject, Observable } from 'rxjs';
import { notificationTime } from '../../defaults';
import { Components } from '../types';
import { takeUntil } from 'rxjs/operators';

type ScrollViewRefType = React.MutableRefObject<ScrollView | undefined | null>;

type ChatStateType = readonly [
  ScrollViewRefType,
  readonly MessageHandle[],
  string | undefined,
  Room | undefined,
  string | undefined,
  (s: string) => void,
  () => void
];

export const ChatState = ({ id, navigation, session, roomId }: Props): ChatStateType => {
  const scrollView = useRef<ScrollView | undefined | null>();

  const [room, setRoom] = useState<Room>();
  const [unsubscribeEvent] = useState(new Subject<void>());
  const [currentMessage, setCurrentMessage] = useState<string>();
  const [chatInformation, setChatInformation] = useState<string>();
  const [messages, setMessages] = useState<readonly MessageHandle[]>([]);
  const [chatInformationTimeout, setChatInformationTimeout] = useState<ReturnType<typeof setTimeout>>();

  // tslint:disable: no-floating-promises
  useEffect(() => {
    const setup = async () => {
      try {
        setRoom(await session.artichoke.getRoom(roomId));
      } catch (e) {
        navigation.navigate(Components.Error, { reason: 'Could not connect to room using artichoke '});
      }

      Keyboard.addListener('keyboardDidShow', scrollToBottom);
    };

    setup();

    return () => {
      Keyboard.removeListener('keyboardDidShow', scrollToBottom);
    };
  }, []);

  useEffect(() => {
    const setupRoom = async () => {
      try {
        if (room) {
          const history = await getRoomMessageHistory(room);
          if (history) {
            setMessages(history.items.map((m) =>
              createMessageHandle(m, m.authorId === id ? MessageStatus.Viewed : MessageStatus.Opposite)));
          }

          room.message$
          .pipe(takeUntil(unsubscribe$()))
          .subscribe(addNewMessage);

          room.typing$
          .pipe(takeUntil(unsubscribe$()))
          .subscribe(() => addChatInformation('User is typing...'));

          room.messageDelivered$
          .pipe(takeUntil(unsubscribe$()))
          .subscribe(() => {
            setMessages(msgs => getMessagesWithStatusUpdate(id, msgs, MessageStatus.Delievered));
          });

          room.marked$
          .pipe(takeUntil(unsubscribe$()))
          .subscribe((msg) => {
            if (msg.authorId !== id) {
              setMessages(msgs => getMessagesWithStatusUpdate(id, msgs, MessageStatus.Viewed));
            }
          });
        }
      } catch (e) {
        navigation.navigate(Components.Error, { reason: `Could not successfully setup conversation\n${(e as Error).message}` });
      }
    };

    setupRoom();

    return () => {
      unsubscribeEvent.next();
    };
  }, [room]);
  // tslint:enable: no-floating-promises

  // tslint:disable-next-line: no-unnecessary-callback-wrapper
  useEffect(() => scrollToBottom(), [messages]);

  const addNewMessage = (message: roomEvents.MessageSent): void => {
    const isAuthor = message.authorId === id;
    const status = isAuthor ? MessageStatus.Undelievered : MessageStatus.Opposite;
    setMessages(msgs => [ ...msgs, createMessageHandle(message, status) ]);

    if (!isAuthor) {
      room?.setDelivered(message.messageId);
      room?.setMark(Date.now());
    }
  };

  const addChatInformation = (text: string): void => {
    setChatInformation(text);

    if (chatInformationTimeout) {
      clearTimeout(chatInformationTimeout);
    }
    const timeout = setTimeout(() => setChatInformation(undefined), notificationTime);
    setChatInformationTimeout(timeout);
  };

  const unsubscribe$ = (): Observable<void> => unsubscribeEvent.asObservable();

  const scrollToBottom = (): void => {
    scrollView.current?.scrollToEnd();
  };

  const onMessageChange = (value: string) => {
    setCurrentMessage(value);
    room?.indicateTyping();
  };

  const onMessageSend = async (): Promise<void> => {
    if (!room) {
      navigation.navigate(Components.Error, { reason: 'Room is not initialized in chat component' });
    }
    else if (currentMessage) {
      try {
        await sendMessage(currentMessage, room);
        setCurrentMessage(undefined);
      } catch (e) {
        addChatInformation('Unable to send message');
      }
    }
    else {
      addChatInformation('Cannot send empty message!');
    }
  };

  return [scrollView, messages, currentMessage, room, chatInformation, onMessageChange, onMessageSend];
};

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
: readonly MessageHandle[] =>
    msgs.map(mh => (mh.authorId !== id || mh.status === MessageStatus.Viewed) ? mh : { ...mh, status });
