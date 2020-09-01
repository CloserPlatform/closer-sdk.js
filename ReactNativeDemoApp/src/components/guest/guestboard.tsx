// tslint:disable: strict-boolean-expressions
// tslint:disable: no-floating-promises
// tslint:disable:
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Session } from '@closerplatform/closer-sdk';
import { SpinnerClient } from '@swagger/spinner';
import { BaseNavigation, Components, ServerParams } from '../types';
import { GuestContext, loadContext, signUpGuest, getGuestProfile } from './guestboard.service';
import { SessionService } from '../../sessionService';
import { Chat } from '../shared/chat';
import { Spinner } from '../shared/spinner';

export type ThisNavigation = BaseNavigation<Components.Guest>;
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
  const [unsubscribeEvent] = useState(new Subject<void>());

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
    // tslint:disable-next-line: cyclomatic-complexity
    const setup = async () => {
      try {
        const sc = new SpinnerClient(`${route.params.spinner}/api`);

        const loadedCtx = await loadContext();
        setGuestCtx({ ...guestCtx, ...loadedCtx });

        if (loadedCtx?.apiKey) {
          sc.apiKey = loadedCtx.apiKey;

          if (loadedCtx.id && loadedCtx.orgId) {
            const ctx = await getGuestProfile(loadedCtx.orgId, loadedCtx.id, sc, navigation);

            if (ctx?.roomId) {
              setGuestCtx(ctx);
            }
            else {
              throw new Error();
            }
          }
        }

        setSpinnerClient(sc);
      } catch (e) {
        navigation.navigate(Components.Error, { reason: 'Could not successfully setup guest profile' });
      }
    };

    setup();

    return () => {
      unsubscribeEvent.next();
    };
  }, []);

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
      return <Spinner />;
    }
    else if (!guestCtx?.roomId) {
      navigation.navigate(Components.Error, { reason: 'Unknown room id after getting guest session' });

      return <></>;
    }
    else if (guestCtx.id) {
      return (
        <Chat roomId={guestCtx.roomId} session={session} id={guestCtx.id} navigation={navigation} />
      );
    }
    else {
      return <Spinner />;
    }
  };

  const render = (): JSX.Element => {
    return (guestCtx?.id && guestCtx.apiKey && guestCtx.orgId) ?
      renderBoard() : renderOrgInput();
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
