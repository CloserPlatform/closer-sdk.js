import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { BaseNavigation, Components, ServerParams } from '../types';
import { Input, Button } from 'react-native-elements';
import { SpinnerClient, AgentCtx } from '@swagger/spinner';
import { Login } from './login';
import { Session, protocol } from '@closerplatform/closer-sdk';
import { SessionService } from '../../sessionService';
import { Chat } from '../shared/chat';
import { Storage, StorageNames } from '../../storage';

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
  const [agentContext, setAgentContext] = useState<AgentContext>();
  const [session, setSession] = useState<Session>();

  useEffect(() => {
    const sc = new SpinnerClient(`${route.params.spinner}/api`);
    loadContext()
    .then(loadedCtx => {
      setAgentContext({ ...agentContext, ...loadedCtx });
      setRoomId(loadedCtx?.roomId);

      if (loadedCtx?.apiKey) {
        sc.apiKey = loadedCtx.apiKey;

        // sc.getSession()
        // .then(agentCtx => {
          //   setAgentContext({ ...agentContext, id: agentCtx.id, orgId: agentCtx.orgId });
          //   setSession(SessionService.connectToArtichoke(
            //     { id: agentCtx.id, apiKey: agentCtx.apiKey },
            //     { artichoke: route.params.artichoke, spinner: route.params.spinner }));
            // })
            // .catch(e => navigation.navigate(Components.Error, { reason: 'Error getting sesion from saved key' }));
        }
    })
    .catch(e => navigation.navigate(Components.Error, { reason: 'Error while loading saved credentials' }));
    setSpinnerClient(sc);
  }, []);

  useEffect(() => {
    if (!session && spinnerClient && agentContext?.apiKey && agentContext.id) {
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
          onPress={async () => {
            if (roomId) {
              await Storage.saveAgent(StorageNames.RoomId, roomId);
              setAgentContext({ ...agentContext, roomId });
            }
          }}
        />
      </View>
    );
  };

  const render = (): JSX.Element => {
    if (spinnerClient) {
      if (agentContext?.id && session) {
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
      else if (agentContext) {
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
        return <Text>No guest context..</Text>;
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

const loadContext = async (): Promise<AgentContext | undefined> => {
  const isGuest = await Storage.getItem(StorageNames.IsGuest);

  if (isGuest === 'false') {
    const apiKey = await Storage.getItem(StorageNames.ApiKey);
    const orgId = await Storage.getItem(StorageNames.OrgId);
    const id =  await Storage.getItem(StorageNames.Id);
    const roomId = await Storage.getItem(StorageNames.RoomId);

    return { apiKey, orgId, id, roomId };
  }
};
