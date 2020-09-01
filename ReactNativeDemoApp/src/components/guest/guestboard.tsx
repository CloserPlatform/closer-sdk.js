// tslint:disable: strict-boolean-expressions
// tslint:disable: no-floating-promises
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { SpinnerClient } from '@swagger/spinner';
import { protocol, Session } from '@closerplatform/closer-sdk';
import { Storage, StorageNames } from '../../storage';
import { BaseNavigation, Components, ServerParams } from '../types';
import { defaultOrg } from '../../defaults';
import { Chat } from '../shared/chat';
import { SessionService } from '../../sessionService';
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
      if (loadedCtx?.apiKey) {
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

const loadContext = async (): Promise<GuestContext | undefined> => {
  const isGuest = await Storage.getItem(StorageNames.IsGuest);

  if (isGuest === 'true') {
    return {
      orgId: await Storage.getItem(StorageNames.OrgId) || defaultOrg,
      id: await Storage.getItem(StorageNames.Id),
      apiKey: await Storage.getItem(StorageNames.ApiKey)
    };
  }
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

        Storage.saveGuest(StorageNames.ApiKey, leadCtx.apiKey);
        Storage.saveGuest(StorageNames.Id, leadCtx.id);
        Storage.saveGuest(StorageNames.OrgId, leadCtx.orgId);

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
