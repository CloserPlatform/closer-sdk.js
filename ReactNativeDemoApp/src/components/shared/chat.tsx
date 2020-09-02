// tslint:disable: no-floating-promises
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Keyboard, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { protocol, Session, Room, roomEvents } from '@closerplatform/closer-sdk';

import { colors, notificationTime } from '../../defaults';
import { createMessageHandle, MessageHandle, getRoomMessageHistory, sendMessage } from './chat.service';

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

  const [unsubscribeEvent] = useState(new Subject<void>());
  const [room, setRoom] = useState<Room>();
  const [information, setInformation] = useState<string>();
  const [currentMessage, setCurrentMessage] = useState<string>();
  const [messages, setMessages] = useState<ReadonlyArray<MessageHandle>>([]);

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
            setMessages(history.items.map(createMessageHandle));
          }

          room.message$
          .pipe(takeUntil(unsubscribe$()))
          .subscribe(addNewMessage);

          room.typing$
          .pipe(takeUntil(unsubscribe$()))
          .subscribe(addTypingIndication);

          room.messageDelivered$
          .pipe(takeUntil(unsubscribe$()))
          .subscribe((m) => console.log('Message delievered', m));

          room.marked$
          .pipe(takeUntil(unsubscribe$()))
          .subscribe(() => console.log('Marked'));
        }
      } catch (e) {
        navigation.navigate(Components.Error, { reason: 'Could not successfully setup conversation'});
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
    setMessages(msgs => [ ...msgs, createMessageHandle(message) ]);
  };

  const addTypingIndication = (): void => {
    setInformation('User is typing...');
    setTimeout(() => setInformation(undefined), notificationTime);
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
        style={[styles.chatMessage, item.authorId === id ? styles.chatOwnMessage : styles.chatOppositeMessage]}
        key={item.messageId}
      >
        <Text style={styles.chatText}>
          {item.text}
        </Text>
      </View>
    );
  };

  const renderMessages = (): JSX.Element => (
    <ScrollView ref={s => scrollView.current = s} style={styles.scrollView}>
      {messages.map(renderMessage)}
    </ScrollView>
  );

  const renderChatInformation = (): JSX.Element | void => {
    if (information) {
      return (
        <View style={styles.chatInformation}>
          <Text style={styles.chatInformationText}>
            {information}
          </Text>
        </View>
      );
    }
  };

  const renderSendingInput = (): JSX.Element => {
    const sendCallback = async (): Promise<void> => {
      if (currentMessage && room) {
        try {
          await sendMessage(currentMessage, room);
          setCurrentMessage(undefined);
        } catch (e) {
          console.error('Error sending');
        }
      }
      else {
        console.error('No message or room while sending message');
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
  scrollView: {
    marginBottom: 15
  },
  chatInformation: {
    height: 30,
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
    backgroundColor: colors.primary
  },
  chatOppositeMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondary
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
