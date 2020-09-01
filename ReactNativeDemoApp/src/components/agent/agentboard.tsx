// tslint:disable: no-floating-promises
import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SpinnerClient } from '@swagger/spinner';
import { Session } from '@closerplatform/closer-sdk';
import { BaseNavigation, Components, ServerParams } from '../types';
import { SessionService } from '../../sessionService';
import { AgentContext, loadContext } from './agentboard.service';
import { Storage, StorageNames } from '../../storage';
import { Chat } from '../shared/chat';
import { Login } from './login';
import { Spinner } from '../shared/spinner';

export type ThisNavigation = BaseNavigation<Components.Agent>;
interface Props {
  readonly navigation: ThisNavigation;
  readonly route: {
    readonly params: ServerParams;
  };
}

// TODO: button colors from defaultStyles
export const AgentBoard = ({ navigation, route}: Props): JSX.Element => {
  const [spinnerClient, setSpinnerClient] = useState<SpinnerClient>();
  const [roomId, setRoomId] = useState<string>();
  const [agentContext, setAgentContext] = useState<AgentContext>();
  const [session, setSession] = useState<Session>();
  const [unsubscribeEvent] = useState(new Subject<void>());

  useEffect(() => {
    const setup = async () => {
      try {
        const sc = new SpinnerClient(`${route.params.spinner}/api`);
        const loadedCtx = await loadContext();
        setAgentContext({ ...agentContext, ...loadedCtx });
        setRoomId(loadedCtx?.roomId);

        if (loadedCtx?.apiKey) {
          sc.apiKey = loadedCtx.apiKey;
        }

        setSpinnerClient(sc);
      } catch (e) {
        navigation.navigate(Components.Error, { reason: 'Error while loading saved credentials' });
      }
    };

    setup();

    return () => {
      unsubscribeEvent.next();
    };
  }, []);

  useEffect(() => {
    if (!session && spinnerClient && agentContext?.apiKey && agentContext.id) {
      spinnerClient.apiKey = agentContext.apiKey;

      const s = SessionService.connectToArtichoke({ apiKey: agentContext.apiKey, id: agentContext.id },
        { artichoke: route.params.artichoke, spinner: route.params.spinner});

      setCallbacks(s);
      setSession(s);
    }
  }, [agentContext]);

  const setCallbacks = (s: Session): void => {
    s.artichoke.error$
    .pipe(takeUntil(unsubscribe$()))
    .subscribe(error => {
      console.log('An error has occured: ', error);
    });

    s.artichoke.serverUnreachable$
    .pipe(takeUntil(unsubscribe$()))
    .subscribe(() => {
      console.log('Server unreachable');
    });

    s.artichoke.roomCreated$
    .pipe(takeUntil(unsubscribe$()))
    .subscribe(m => {
      console.log('Room created: ', m);
    });

    s.artichoke.roomInvitation$
    .pipe(takeUntil(unsubscribe$()))
    .subscribe(invitation => {
      console.log('Received room invitation: ', invitation);
    });

    s.artichoke.callCreated$
    .pipe(takeUntil(unsubscribe$()))
    .subscribe(call => {
      console.log('Call created: ', call);
    });

    s.artichoke.callInvitation$
    .pipe(takeUntil(unsubscribe$()))
    .subscribe(async callInvitation => {
      console.log('Received call invitation: ', callInvitation);
    });

    s.artichoke.connection$
    .pipe(takeUntil(unsubscribe$()))
    .subscribe(
      () => {
        console.log('Connected to Artichoke!');
        // credentials.setDeviceId(hello.deviceId);
      },
      err => console.error('Connection error', err),
      () => {
        console.log('Session disconnected');
      }
    );
  };

  const unsubscribe$ = (): Observable<void> => {
    return unsubscribeEvent.asObservable();
  };

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
