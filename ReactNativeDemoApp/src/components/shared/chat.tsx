import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { protocol, Session, Room, roomEvents } from '@closerplatform/closer-sdk';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface MessageHandle {
  readonly authorId: protocol.ID;
  readonly messageId: protocol.ID;
  readonly text: string;
}

interface Props {
  readonly roomId: protocol.ID;
  readonly session: Session;
  readonly id: protocol.ID;
}

export const Chat = ({ roomId, session, id }: Props): JSX.Element => {
  const unsubscribeEvent = new Subject<void>();

  const [room, setRoom] = useState<Room>();
  const [currentMessage, setCurrentMessage] = useState<string>();
  const [messages, setMessages] = useState<ReadonlyArray<MessageHandle>>([]);

  useEffect(() => {
    session.artichoke.getRoom(roomId)
    .then((r) => {
      setRoom(r);
    })
    .catch(e => console.error('Error setting artichoke room: ', e));
  }, []);

  useEffect(() => {
    if (room) {
      getRoomMessageHistory(room)
      .then(history => {
        if (history) {
          const handles = (history.items.map(item => {
              const mh = {
                authorId: item.authorId,
                messageId: item.messageId,
                text: item.message
              };

              return mh;
          }));

          if (handles) {
            setMessages(handles);
          }
        }
      })
      .catch(e => console.error('Error fetching messages: ', e));

      console.log('Setting subs', room.message$);
      room.message$
      .pipe(takeUntil(unsubscribe$()))
      .subscribe(message => {
        const newMessageHandle: MessageHandle = {
          authorId: message.authorId,
          messageId: message.messageId,
          text: message.message
        };
        console.log('Room message');

        setMessages([ ...messages, newMessageHandle]);
      });

      room.typing$
      // .pipe(takeUntil(unsubscribe$()))
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

  const unsubscribe$ = (): Observable<void> => {
    return unsubscribeEvent.asObservable();
  };

  const renderMessage = ({ item }: { readonly item: MessageHandle})  => {
    return (
      <View style={[styles.chatMessage, item.authorId === id ? styles.chatOwnMessage : styles.chatOppositeMessage]}>
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
        <FlatList
          data={messages}
          keyExtractor={(message: MessageHandle) => message.messageId}
          renderItem={renderMessage}
        />
      );
    }
  };

  const renderSendingInput = (): JSX.Element => {
    const sendButton = (
      <Button
        title='Send'
        type='outline'
        onPress={() => {
            if (currentMessage && room) {
              // tslint:disable-next-line: no-floating-promises
              sendMessage(currentMessage, room);
              setCurrentMessage(undefined);
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
        rightIcon={sendButton}
        value={currentMessage}
        onChangeText={setCurrentMessage}
      />
    );
  };

  const renderChat = (): JSX.Element => {
    return (
      <View style={styles.chatContainer}>
        {renderMessages()}
        {renderSendingInput()}
      </View>
    );
  };

  const render = (): JSX.Element => {
    if (!room) {
      return (
        <View style={styles.infoContainer}>
          <Text>Waiting for room connection...</Text>
        </View>
      );
    }
    else {
      return renderChat();
    }
  };

  return render();
};

const styles = StyleSheet.create({
  chatContainer: {
    padding: 15,
    flex: 1,
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
  infoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});

const getRoomMessageHistory = async (room: Room): Promise<protocol.Paginated<roomEvents.MessageSent> | void> => {
  const nMessagesToRetrieve = 25;

  try {
    const filter: protocol.HistoryFilter = {
      filter: [roomEvents.MessageSent.tag],
      customFilter: []
    };
    const messages = await room.getLatestMessages(nMessagesToRetrieve, filter);

    return messages as protocol.Paginated<roomEvents.MessageSent>;
  } catch (e) {
    console.error(e);
  }
};

const sendMessage = async (message: string, room: Room): Promise<void> => {
  try {
    await room.send(message).toPromise();
  } catch (e) {
    console.error('Error sending message: ', e);
  }
};
