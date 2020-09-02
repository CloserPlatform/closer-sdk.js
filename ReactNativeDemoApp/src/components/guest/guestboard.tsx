import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Input, Button } from 'react-native-elements';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Session } from '@closerplatform/closer-sdk';
import { SpinnerClient } from '@swagger/spinner';

import { BaseNavigation, Components, ServerParams } from '../types';
import { GuestContext, loadContext, signUpGuest, getGuestProfile } from './guestboard.service';
import { SessionService } from '../../session.service';

import { Chat } from '../shared/chat';
import { Spinner } from '../shared/spinner';
import { defaultStyles } from '../../defaults';
import { Storage } from '../../storage';

export type ThisNavigation = BaseNavigation<Components.Guest>;
interface Props {
  readonly navigation: ThisNavigation;
  readonly route: {
    readonly params: ServerParams;
  };
}

export const GuestBoard = ({ navigation, route }: Props): JSX.Element => {
  const [session, setSession] = useState<Session>();
  const [guestCtx, setGuestCtx] = useState<GuestContext>();
  const [unsubscribeEvent] = useState(new Subject<void>());
  const [spinnerClient, setSpinnerClient] = useState<SpinnerClient>();

  useEffect(() => {
    if (guestCtx?.roomId && !session && guestCtx.id && guestCtx.apiKey) {
      const authCtx = { id: guestCtx.id, apiKey: guestCtx.apiKey };
      const servers = { artichoke: route.params.artichoke, spinner: route.params.spinner };

      const s = SessionService.connect(authCtx, servers);
      setSession(s);
      setCallbacks(s);
    }
  }, [guestCtx]);

  // tslint:disable: no-floating-promises
  useEffect(() => {
    const setup = async () => {
      try {
        const sc = new SpinnerClient(`${route.params.spinner}/api`);

        const loadedCtx = await loadContext();
        setGuestCtx({ ...guestCtx, ...loadedCtx });

        if (loadedCtx?.apiKey) {
          sc.apiKey = loadedCtx.apiKey;

          const ctx = await getGuestProfile(loadedCtx.orgId, loadedCtx.id, sc);
          setGuestCtx(ctx);

        }

        setSpinnerClient(sc);
      } catch (e) {
        navigation.navigate(Components.Error,
          { reason: `Could not successfully setup guest profile\n${(e as Error).message}` });
      }
    };

    setup();

    return () => {
      unsubscribeEvent.next();
    };
  }, []);
  // tslint:enable: no-floating-promises

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
      },
      err => console.error('Connection error', err),
      () => {
        console.log('Session disconnected');
      }
    );
  };

  const unsubscribe$ = (): Observable<void> => unsubscribeEvent.asObservable();

  const renderOrgInput = (): JSX.Element => (
    <View style={defaultStyles.container}>
      <Input
        label='Organization id:'
        value={guestCtx?.orgId}
        onChangeText={(value) => setGuestCtx({ ...guestCtx, orgId: value })}
        inputStyle={styles.input}
      />
      <Button
        title='Sign up as guest'
        buttonStyle={defaultStyles.button}
        onPress={async () => {
          if (guestCtx) {
            try {
              const ctx = await signUpGuest(guestCtx.orgId, spinnerClient);
              setGuestCtx({ ...guestCtx, ...ctx });
            } catch (e) {
              navigation.navigate(Components.Error,
                { reason: `Could not sign up as guest\n${(e as Error).message}` });
            }
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
  input: {
    fontSize: 16,
  }
});
