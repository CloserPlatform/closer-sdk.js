import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { protocol, Session } from '@closerplatform/closer-sdk';

import { colors } from '../../defaults';
import { MessageHandle, MessageStatus, ChatState } from './chat.service';

import { ThisNavigation as GuestNavigation } from '../guest/guestboard';
import { ThisNavigation as AgentNavigation } from '../agent/agentboard';
import { Spinner } from './spinner';

type ParentNavigation = GuestNavigation | AgentNavigation;
export interface Props {
  readonly roomId: protocol.ID;
  readonly session: Session;
  readonly id: protocol.ID;
  readonly navigation: ParentNavigation;
}

export const Chat = ({ roomId, session, id, navigation }: Props): JSX.Element => {
  const [scrollView, messages, currentMessage, room, chatInformation, onMessageChange, onMessageSend]
    = ChatState({ roomId, session, id, navigation });

  const renderMessage = (item: MessageHandle)  => (
    <View style={[styles.chatMessage, getMessageStyle(item.status)]} key={item.messageId}>
      <Text style={styles.chatText}>{item.text}</Text>
    </View>
  );

  const renderMessages = (): JSX.Element => (
    <ScrollView ref={s => scrollView.current = s} >
      {messages.map(renderMessage)}
    </ScrollView>
  );

  const renderChatInformation = (): JSX.Element | void => (
    <View style={styles.chatInformation}>
      {chatInformation ? <Text style={styles.chatInformationText}>{chatInformation}</Text> : undefined}
    </View>
  );

  const renderSendingInput = (): JSX.Element => {
    const sendButton = (
      <Button
        title='Send'
        type='outline'
        buttonStyle={{borderColor: colors.secondary}}
        titleStyle={{color: colors.secondary}}
        onPress={onMessageSend}
      />
    );

    return (
      <Input
        placeholder='Your message...'
        inputContainerStyle={styles.sendingInput}
        rightIcon={sendButton}
        value={currentMessage}
        onChangeText={onMessageChange}
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
  chatOwnMessageUndelivered: {
    backgroundColor: colors.lightGray,
  },
  chatOwnMessageDelivered: {
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
  }
});

const getMessageStyle = (status: MessageStatus): readonly {}[] => {
  switch (status) {
    case MessageStatus.Opposite:
      return [styles.chatMessage, styles.chatOppositeMessage];
    case MessageStatus.Undelivered:
      return [styles.chatMessage, styles.chatOwnMessage, styles.chatOwnMessageUndelivered];
    case MessageStatus.Delivered:
      return [styles.chatMessage, styles.chatOwnMessage, styles.chatOwnMessageDelivered];
    case MessageStatus.Viewed:
      return [styles.chatMessage, styles.chatOwnMessage, styles.chatOwnMessageViewed];
    default:
      return [styles.chatMessage];
  }
// tslint:disable-next-line: max-file-line-count
};
