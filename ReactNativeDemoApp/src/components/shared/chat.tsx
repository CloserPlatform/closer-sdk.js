// tslint:disable: no-floating-promises
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Keyboard, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { protocol, Session, Room, roomEvents } from '@closerplatform/closer-sdk';

import { colors, notificationTime } from '../../defaults';
import { createMessageHandle, MessageHandle, getRoomMessageHistory,
  sendMessage, MessageStatus, getMessagesWithStatusUpdate } from './chat.service';

import { ThisNavigation as GuestNavigation } from '../guest/guestboard';
import { ThisNavigation as AgentNavigation } from '../agent/agentboard';
import { Spinner } from './spinner';
import { Components } from '../types';

type ParentNavigation = GuestNavigation | AgentNavigation;
interface Props {
  readonly roomId: protocol.ID;
  readonly session: Session;
  readonly id: protocol.ID;
  readonly navigation: ParentNavigation;
}

export const Chat = ({ roomId, session, id, navigation }: Props): JSX.Element => {
  const scrollView = useRef<ScrollView | undefined | null>();

  const [room, setRoom] = useState<Room>();
  const [unsubscribeEvent] = useState(new Subject<void>());
  const [currentMessage, setCurrentMessage] = useState<string>();
  const [chatInformation, setChatInformation] = useState<string>();
  const [messages, setMessages] = useState<ReadonlyArray<MessageHandle>>([]);
  const [chatInformationTimeout, setChatInformationTimeout] = useState<ReturnType<typeof setTimeout>>();

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

  const unsubscribe$ = (): Observable<void> => {
    return unsubscribeEvent.asObservable();
  };

  const scrollToBottom = (): void => {
    scrollView.current?.scrollToEnd();
  };

  const renderMessage = (item: MessageHandle)  => {
    return (
      <View
        style={[styles.chatMessage, getMessageStyle(item.status)]}
        key={item.messageId}
      >
        <Text style={styles.chatText}>{item.text}</Text>
      </View>
    );
  };

  const renderMessages = (): JSX.Element => (
    <ScrollView ref={s => scrollView.current = s} >
      {messages.map(renderMessage)}
    </ScrollView>
  );

  const renderChatInformation = (): JSX.Element | void => {
    return (
      <View style={styles.chatInformation}>
        {chatInformation ? <Text style={styles.chatInformationText}>{chatInformation}</Text> : undefined}
      </View>
    );
  };

  const renderSendingInput = (): JSX.Element => {
    const sendCallback = async (): Promise<void> => {
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

    const sendButton = (
      <Button
        title='Send'
        type='outline'
        buttonStyle={{borderColor: colors.secondary}}
        titleStyle={{color: colors.secondary}}
        onPress={sendCallback}
      />
    );

    return (
      <Input
        placeholder='Your message...'
        inputContainerStyle={styles.sendingInput}
        rightIcon={sendButton}
        value={currentMessage}
        onChangeText={(value) => {
          setCurrentMessage(value);
          room?.indicateTyping();
        }}
      />
    );
  };

  const renderChat = (): JSX.Element => {
    const offset = 80;

    return (
      // TODO: this keyboard avoiding view should probably implement different behavior on android
      <KeyboardAvoidingView behavior='padding' style={styles.chatContainer} keyboardVerticalOffset={offset}>
        {renderMessages()}
        {renderChatInformation()}
        {renderSendingInput()}
      </KeyboardAvoidingView>
    );
  };

  const render = (): JSX.Element => (
    room ? renderChat() : <Spinner />
  );

  return render();
};

const styles = StyleSheet.create({
  chatContainer: {
    padding: 15,
    flex: 1,
    // backgroundColor: '#3f3f3f'
  },
  chatInformation: {
    height: 30,
    marginVertical: 5,
    marginHorizontal: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInformationText: {
    color: colors.lightGray
  },
  chatMessage: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 5
  },
  chatOwnMessage: {
    alignSelf: 'flex-end',
  },
  chatOwnMessageUndelievered: {
    backgroundColor: colors.lightGray,
  },
  chatOwnMessageDelievered: {
    backgroundColor: colors.lightGray,
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  chatOwnMessageViewed: {
    backgroundColor: colors.secondary
  },
  chatOppositeMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary
  },
  chatText: {
    color: 'white'
  },
  sendingInput: {
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    borderBottomColor: colors.primary,
    paddingVertical: 5
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

const getMessageStyle = (status: MessageStatus): readonly {}[] => {
  switch (status) {
    case MessageStatus.Opposite:
      return [styles.chatMessage, styles.chatOppositeMessage];
    case MessageStatus.Undelievered:
      return [styles.chatMessage, styles.chatOwnMessage, styles.chatOwnMessageUndelievered];
    case MessageStatus.Delievered:
      return [styles.chatMessage, styles.chatOwnMessage, styles.chatOwnMessageDelievered];
    case MessageStatus.Viewed:
      return [styles.chatMessage, styles.chatOwnMessage, styles.chatOwnMessageViewed];
    default:
      return [styles.chatMessage];
  }
// tslint:disable-next-line: max-file-line-count
};
