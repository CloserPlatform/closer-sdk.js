import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { BaseNavigation, Components, ServerParams } from '../types';
import { Input, Button } from 'react-native-elements';
import { SpinnerClient, AgentCtx } from '@swagger/spinner';
import { Login } from './login';
import { Session, protocol } from '@closerplatform/closer-sdk';
import { SessionService } from '../../sessionService';
import { Chat } from '../shared/chat';

export interface AgentContext {
  readonly id?: protocol.ID;
  readonly orgId?: protocol.ID;
  readonly roomId?: protocol.ID;
  readonly apiKey?: string;
}

type ThisNavigation = BaseNavigation<Components.Agent>;
interface Props {
  readonly navigation: ThisNavigation;
  readonly route: {
    readonly params: ServerParams;
  };
}

export const AgentBoard = ({ navigation, route}: Props): JSX.Element => {
  const [spinnerClient, setSpinnerClient] = useState<SpinnerClient>();
  const [roomId, setRoomId] = useState<string>();
  const [agentContext, setAgentContext] = useState<AgentContext>(loadContext());
  const [session, setSession] = useState<Session>();

  useEffect(() => {
    const sc = new SpinnerClient(`${route.params.spinner}/api`);
    if (agentContext.apiKey) {
      sc.apiKey = agentContext.apiKey;

      sc.getSession()
      .then(agentCtx => {
        setAgentContext({ ...agentContext, id: agentCtx.id, orgId: agentCtx.orgId });
        setSession(SessionService.connectToArtichoke(
          { id: agentCtx.id, apiKey: agentCtx.apiKey },
          { artichoke: route.params.artichoke, spinner: route.params.spinner }));
      })
      .catch(e => navigation.navigate(Components.Error, { reason: 'Error getting sesion from saved key' }));
    }

    setSpinnerClient(sc);
  }, []);

  useEffect(() => {
    if (!session && spinnerClient && agentContext.apiKey && agentContext.id) {
      spinnerClient.apiKey = agentContext.apiKey;

      setSession(SessionService.connectToArtichoke({ apiKey: agentContext.apiKey, id: agentContext.id },
        { artichoke: route.params.artichoke, spinner: route.params.spinner}));
    }
  }, [agentContext]);

  const renderRoomInput = (): JSX.Element => {
    return (
      <View style={styles.roomInputContainer}>
        <Input
          placeholder='Room id...'
          autoCapitalize='none'
          value={roomId}
          onChangeText={setRoomId}
        />
        <Button
          title='Connect'
          style={styles.button}
          onPress={() => setAgentContext({ ...agentContext, roomId })}
        />
      </View>
    );
  };

  const render = (): JSX.Element => {
    if (spinnerClient) {
      if (agentContext.id && session) {
        if (agentContext.roomId) {
          return (
            <Chat
              roomId={agentContext.roomId}
              session={session}
              id={agentContext.id}
            />
          );
        }
        else {
          return renderRoomInput();
        }
      }
      else {
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
    }
    else {
      return <Text>Waiting for spinner client initialization...</Text>;
    }
  };

  return render();
};

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    padding: 10,
    marginBottom: 25,
    textAlign: 'center'
  },
  button: {
    marginHorizontal: 20,
    marginVertical: 10,
  },
  container: {
    padding: 25,
  },
  roomInputContainer: {
    padding: 20,
  }
});

// TODO: Load from saved memory
const loadContext = (): AgentContext => {
  return {
    apiKey: '66711a7f-993c-499d-8a95-b52337822f33',
    // id: '90d1bcf5-2927-4e53-a059-16012457defd',
    // orgId: '510ae455-69a3-4b16-b1cc-6e2b72c70e90',
    roomId: '53abd640-b433-4c13-9e0d-8d42ea48bf2e'
  };
};
