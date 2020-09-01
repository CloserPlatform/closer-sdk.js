import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Keyboard, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { protocol, Session, Room, roomEvents } from '@closerplatform/closer-sdk';
import { createMessageHandle, MessageHandle, getRoomMessageHistory, sendMessage } from './chat.service';
import { Spinner } from './spinner';

interface Props {
  readonly roomId: protocol.ID;
  readonly session: Session;
  readonly id: protocol.ID;
}

export const Chat = ({ roomId, session, id }: Props): JSX.Element => {
  const scrollView = useRef<ScrollView | undefined | null>();

  const [unsubscribeEvent] = useState(new Subject<void>());
  const [room, setRoom] = useState<Room>();
  const [currentMessage, setCurrentMessage] = useState<string>();
  const [messages, setMessages] = useState<ReadonlyArray<MessageHandle>>([]);

  useEffect(() => {
    session.artichoke.getRoom(roomId)
    .then((r) => {
      setRoom(r);
    })
    .catch(e => console.error('Error setting artichoke room: ', e));

    Keyboard.addListener('keyboardDidShow', scrollToBottom);

    return () => {
      Keyboard.removeListener('keyboardDidShow', scrollToBottom);
    };
  }, []);

  useEffect(() => {
    if (room) {
      getRoomMessageHistory(room)
      .then(history => {
        if (history) {
          const handles = (history.items.map(createMessageHandle));

          if (handles) {
            setMessages(handles);
          }
        }
      })
      .catch(e => console.error('Error fetching messages: ', e));

      room.message$
      .pipe(takeUntil(unsubscribe$()))
      .subscribe(addNewMessage);

      room.typing$
      .pipe(takeUntil(unsubscribe$()))
      .subscribe(() => console.log('User is typing...'));

      room.messageDelivered$
      .pipe(takeUntil(unsubscribe$()))
      .subscribe((m) => console.log('Message delievered', m));

      room.marked$
      .pipe(takeUntil(unsubscribe$()))
      .subscribe(() => console.log('Marked'));
    }

    return () => {
      unsubscribeEvent.next();
    };
  }, [room]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addNewMessage = (message: roomEvents.MessageSent): void => {
    setMessages(msgs => [ ...msgs, createMessageHandle(message) ]);
  };

  const unsubscribe$ = (): Observable<void> => {
    return unsubscribeEvent.asObservable();
  };

  const scrollToBottom = (): void => {
    if (scrollView.current) {
      scrollView.current.scrollToEnd();
    }
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

  const renderMessages = (): JSX.Element => {
    if (!messages) {
      return <Text>No messages...</Text>;
    }
    else {
      return (
        <ScrollView ref={s => scrollView.current = s} style={styles.scrollView}>
          {messages.map(renderMessage)}
        </ScrollView>
      );
    }
  };

  const renderSendingInput = (): JSX.Element => {
    const sendButton = (
      <Button
        title='Send'
        type='outline'
        onPress={async () => {
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
          }
        }
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
      // TODO: this keyboard avoiding view should probably implement different behavior on android?
      <KeyboardAvoidingView behavior='padding' style={styles.chatContainer} keyboardVerticalOffset={offset}>
        {renderMessages()}
        {renderSendingInput()}
      </KeyboardAvoidingView>
    );
  };

  const render = (): JSX.Element => {
    return room ? renderChat() : <Spinner />;
  };

  return render();
};

const styles = StyleSheet.create({
  chatContainer: {
    padding: 15,
    flex: 1,
  },
  scrollView: {
    marginBottom: 15
  },
  chatMessage: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
    borderRadius: 5
  },
  chatOwnMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#00ab8e'
  },
  chatOppositeMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#107377'
  },
  chatText: {
    color: 'white'
  },
  sendingInput : {
    borderTopWidth: 1,
    borderTopColor: '#00ab8e',
    borderBottomColor: '#00ab8e',
    paddingVertical: 5
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
