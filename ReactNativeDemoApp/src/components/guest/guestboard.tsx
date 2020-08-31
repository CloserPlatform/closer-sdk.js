// tslint:disable: strict-boolean-expressions
// tslint:disable: no-floating-promises
import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import { Text, View, StyleSheet } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { SpinnerClient } from '@swagger/spinner';
import { protocol, Session } from '@closerplatform/closer-sdk';
import { BaseNavigation, Components, ServerParams, StorageNames } from '../types';
import { defaultOrg } from '../../defaults';
import { Chat } from '../shared/chat';
import { SessionService } from '../../sessionService';
import { load } from '../../../../dist/config/config';
interface GuestContext {
  readonly apiKey?: protocol.ApiKey;
  readonly id?: protocol.ID;
  readonly orgId?: protocol.ID;
  readonly roomId?: protocol.ID;
}

type ThisNavigation = BaseNavigation<Components.Guest>;
interface Props {
  readonly navigation: ThisNavigation;
  readonly route: {
    readonly params: ServerParams;
  };
}

export const GuestBoard = ({ navigation, route}: Props): JSX.Element => {
  const [guestCtx, setGuestCtx] = useState<GuestContext>();
  const [spinnerClient, setSpinnerClient] = useState<SpinnerClient>();
  const [session, setSession] = useState<Session>();

  useEffect(() => {
    if (guestCtx?.roomId && !session && guestCtx.id && guestCtx.apiKey) {
      const authCtx = { id: guestCtx.id, apiKey: guestCtx.apiKey };
      const servers = { artichoke: route.params.artichoke, spinner: route.params.spinner };

      const s = SessionService.connectToArtichoke(authCtx, servers);
      setSession(s);
      setCallbacks(s);
    }
  }, [guestCtx]);

  useEffect(() => {
    loadContext()
    .then(loadedCtx => {
      setGuestCtx({ ...guestCtx, ...loadedCtx });
      if (loadedCtx.apiKey) {
        const sc = new SpinnerClient(`${route.params.spinner}/api`);
        sc.apiKey = loadedCtx.apiKey;
        setSpinnerClient(sc);

        if (loadedCtx.id && loadedCtx.orgId) {
          getGuestProfile(loadedCtx.orgId, loadedCtx.id, sc, navigation)
          .then(ctx => {
            if (!ctx || !ctx.roomId) {
              throw new Error();
            }
            else {
              setGuestCtx(ctx);
              AsyncStorage.setItem('isGuest', 'true');
            }
          })
          .catch(e => {
            navigation.navigate(Components.Error, { reason: 'Fetched invalid guest profile' });
          });
        }
      }
    })
    .catch(e => navigation.navigate(Components.Error, { reason: 'Error loading saved credentials' }));
  }, []);

  const renderOrgInput = (): JSX.Element => (
    <View style={styles.container}>
      <Input
        label='Organization id:'
        value={guestCtx?.orgId}
        onChangeText={(value) => setGuestCtx({ ...guestCtx, orgId: value})}
        inputStyle={styles.input}
      />
      <Button
        title='Sign up as guest'
        style={styles.signUpButton}
        // TODO: Receive and save in state guest conntext from signUpGuest
        onPress={async () => {
          if (guestCtx) {
            const ctx = await signUpGuest(guestCtx.orgId, spinnerClient, navigation);
            setGuestCtx({ ...guestCtx, ...ctx });
          }
        }}
        />
    </View>
  );

  const renderBoard = (): JSX.Element => {
    if (!session) {
      return <Text>Waiting for session...</Text>;
    }
    else if (!guestCtx?.roomId) {
      return <Text>Room is not specified</Text>;
    }
    else if (guestCtx.id) {
      return (
        <Chat roomId={guestCtx.roomId} session={session} id={guestCtx.id}/>
      );
    }
    else {
      return <Text>No id</Text>;
    }
  };

  const render = (): JSX.Element => {
    if (guestCtx?.id && guestCtx.apiKey && guestCtx.orgId) {
      return renderBoard();
    }
    else {
      return renderOrgInput();
    }
  };

  return render();
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 30
  },
  input: {
    fontSize: 16,
  },
  signUpButton: {
    marginHorizontal: 30
  }
});

const loadContext = async (): Promise<GuestContext> => {
  return {
    orgId: await AsyncStorage.getItem(StorageNames.OrgId) || defaultOrg,
    id: await AsyncStorage.getItem(StorageNames.Id) || 'e4f96178-04e2-46cf-aed2-dcbecaf023c4',
    apiKey: await AsyncStorage.getItem(StorageNames.ApiKey) || '6bd77298-9e3a-4d62-a2dd-97b374c5a481'
  };
};

const saveApiKey = (apiKey: string): void => {
  AsyncStorage.setItem(StorageNames.ApiKey, apiKey);
  AsyncStorage.setItem(StorageNames.IsGuest, 'true');
};
const saveId = (id: string): void => {
  AsyncStorage.setItem(StorageNames.Id, id);
  AsyncStorage.setItem(StorageNames.IsGuest, 'true');
};
const saveOrgId = (orgId: string): void => {
  AsyncStorage.setItem(StorageNames.OrgId, orgId);
  AsyncStorage.setItem(StorageNames.IsGuest, 'true');
};

const signUpGuest = async (orgId: string | undefined, spinnerClient: SpinnerClient | undefined,
  navigation: ThisNavigation): Promise<GuestContext | undefined> => {
    if (!orgId) {
      navigation.navigate(Components.Error, { reason: 'No org id while trying to sign up guest' });
    }
    else if (!spinnerClient) {
      navigation.navigate(Components.Error, { reason: 'Spinner client does not exist' });
    }
    else {
      try {
        const leadCtx = await spinnerClient.signUpGuest({ orgId });
        spinnerClient.apiKey = leadCtx.apiKey;

        saveApiKey(leadCtx.apiKey);
        saveId(leadCtx.id);
        saveOrgId(leadCtx.orgId);

        return { apiKey: leadCtx.apiKey, id: leadCtx.id, roomId: leadCtx.roomId, orgId };
      } catch (e) {
        navigation.navigate(Components.Error, { reason: 'Could not sign up as guest at spinner api' });
      }
    }
};

const getGuestProfile = async (orgId: string | undefined, id: string| undefined,
  spinnerClient: SpinnerClient | undefined, navigation: ThisNavigation): Promise<GuestContext | undefined> => {
    if (!orgId || !id) {
      navigation.navigate(Components.Error, { reason: 'No org or id while trying to get guest profile' });
    }
    else if (!spinnerClient) {
      navigation.navigate(Components.Error, { reason: 'Spinner client does not exist' });
    }
    else if (!spinnerClient.apiKey) {
      navigation.navigate(Components.Error, { reason: 'Api key is not specified' });
    }
    else {
      try {
        const guestProfile = await spinnerClient.getGuestProfile(orgId, id);

        return { roomId: guestProfile.roomId, apiKey: spinnerClient.apiKey, orgId, id };
      } catch (e) {
        navigation.navigate(Components.Error, { reason: 'Could not get guest profile at spinner api' });
      }
    }
};

const setCallbacks = (session: Session): void => {
  session.artichoke.error$.subscribe(error => {
    console.log('An error has occured: ', error);
  });

  session.artichoke.serverUnreachable$.subscribe(() => {
    console.log('Server unreachable');
  });

  session.artichoke.roomCreated$.subscribe(m => {
    console.log('Room created: ', m);
  });

  session.artichoke.roomInvitation$.subscribe(invitation => {
    console.log('Received room invitation: ', invitation);
  });

  session.artichoke.callCreated$.subscribe(call => {
    console.log('Call created: ', call);
  });

  session.artichoke.callInvitation$.subscribe(async callInvitation => {
    console.log('Received call invitation: ', callInvitation);
  });

  session.artichoke.connection$.subscribe(
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
