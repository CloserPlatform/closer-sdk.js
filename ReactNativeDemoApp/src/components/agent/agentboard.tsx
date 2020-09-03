import React from 'react';
import { View } from 'react-native';
import { Input, Button } from 'react-native-elements';

import { BaseNavigation, Components, ServerParams } from '../types';
import { defaultStyles } from '../../defaults';
import { AgentBoardState } from './agentboard.service';

import { Chat } from '../shared/chat';
import { Login } from './login';
import { Spinner } from '../shared/spinner';

export type ThisNavigation = BaseNavigation<Components.Agent>;
export interface Props {
  readonly navigation: ThisNavigation;
  readonly route: {
    readonly params: ServerParams;
  };
}

export const AgentBoard = ({ navigation, route}: Props): JSX.Element => {
  const [agentContext, setAgentContext, session, spinnerClient, onRoomInputClick, roomId, setRoomId]
    = AgentBoardState({ navigation, route });

  const renderRoomInput = (): JSX.Element => (
    <View style={defaultStyles.container}>
      <Input
        placeholder='Room id...'
        autoCapitalize='none'
        value={roomId}
        onChangeText={setRoomId}
      />
      <Button
        title='Connect'
        buttonStyle={defaultStyles.button}
        onPress={onRoomInputClick}
      />
    </View>
  );

  const renderLogin = (): JSX.Element => {
    if (agentContext && spinnerClient) {
      return (
        <Login
          agentContext={agentContext}
          setAgentContext={setAgentContext}
          artichoke={route.params.artichoke}
          spinner={route.params.spinner}
          spinnerClient={spinnerClient}
        />
      );
    }
    else {
      return <Spinner />;
    }
  };

  const renderInner = (): JSX.Element => {
    if (agentContext?.id && session) {
      if (agentContext.roomId) {
        return (
          <Chat
            roomId={agentContext.roomId}
            session={session}
            id={agentContext.id}
            navigation={navigation}
          />
        );
      }
      else {
        return renderRoomInput();
      }
    }
    else {
      return renderLogin();
    }
  };

  const render = (): JSX.Element => (
    spinnerClient ? renderInner() : <Spinner />
  );

  return render();
};
