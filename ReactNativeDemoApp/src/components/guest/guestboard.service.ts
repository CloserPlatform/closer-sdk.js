import { SpinnerClient } from '@swagger/spinner';
import { protocol, Session } from '@closerplatform/closer-sdk';
import { Storage, StorageNames } from '../../storage';

import { defaultOrg } from '../../defaults';
import { Components } from '../types';

import { Props } from './guestboard';
import { useState, useEffect } from 'react';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SessionService } from '../../session.service';

export interface GuestContext {
  readonly apiKey?: protocol.ApiKey;
  readonly id?: protocol.ID;
  readonly orgId?: protocol.ID;
  readonly roomId?: protocol.ID;
}

type GuestBoardStateType = readonly [
  GuestContext | undefined,
  Session | undefined,
  (s: string) => void,
  () => void
];

export const GuestBoardState = ({ navigation, route }: Props): GuestBoardStateType => {
    const [session, setSession] = useState<Session>();
    const [guestContext, setGuestCtx] = useState<GuestContext>();
    const [unsubscribeEvent] = useState(new Subject<void>());
    const [spinnerClient, setSpinnerClient] = useState<SpinnerClient>();

    useEffect(() => {
      if (guestContext?.roomId && !session && guestContext.id && guestContext.apiKey) {
        const authCtx = { id: guestContext.id, apiKey: guestContext.apiKey };
        const servers = { artichoke: route.params.artichoke, spinner: route.params.spinner };

        const s = SessionService.connect(authCtx, servers);
        setSession(s);
        setCallbacks(s);
      }
    }, [guestContext]);

    // tslint:disable: no-floating-promises
    useEffect(() => {
      const setup = async () => {
        try {
          const sc = new SpinnerClient(`${route.params.spinner}/api`);

          const loadedCtx = await loadContext();
          setGuestCtx({ ...guestContext, ...loadedCtx });

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

    const onOrgInputChange = (value: string): void => {
      setGuestCtx({ ...guestContext, orgId: value });
    };

    const onOrgInputClick = async () => {
      if (guestContext) {
        try {
          const ctx = await signUpGuest(guestContext.orgId, spinnerClient);
          setGuestCtx({ ...guestContext, ...ctx });
        } catch (e) {
          navigation.navigate(Components.Error,
            { reason: `Could not sign up as guest\n${(e as Error).message}` });
        }
      }
    };

    return [guestContext, session, onOrgInputChange, onOrgInputClick];
};

export const loadContext = async (): Promise<GuestContext | undefined> => {
  const isGuest = await Storage.getItem(StorageNames.IsGuest);

  if (isGuest === 'true') {
    return {
      orgId: await Storage.getItem(StorageNames.OrgId),
      id: await Storage.getItem(StorageNames.Id),
      apiKey: await Storage.getItem(StorageNames.ApiKey)
    };
  }
  else {
    Storage.clearAll();

    return { orgId: defaultOrg };
  }
};

// tslint:disable: no-floating-promises
export const signUpGuest = async (orgId: string | undefined, spinnerClient: SpinnerClient | undefined)
  : Promise<GuestContext | undefined> => {
    if (!orgId) {
      throw new Error('No org id while trying to sign up guest');
    }
    else if (!spinnerClient) {
      throw new Error('Spinner client does not exist');
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
        throw new Error(`Error signing up as guest at spinner api: ${(e as Error).message}`);
      }
    }
};
// tslint:enable: no-floating-promises

export const getGuestProfile = async (orgId: string | undefined, id: string | undefined,
  spinnerClient: SpinnerClient | undefined): Promise<GuestContext | undefined> => {
    if (!orgId) {
      throw new Error('No org or id while trying to get guest profile');
    }
    else if (!id) {
      throw new Error('No id while trying to get guest profile');
    }
    else if (!spinnerClient) {
      throw new Error('Spinner client does not exist');
    }
    else if (!spinnerClient.apiKey) {
      throw new Error('Api key is not specified');
    }
    else {
      try {
        const guestProfile = await spinnerClient.getGuestProfile(orgId, id);

        return { roomId: guestProfile.roomId, apiKey: spinnerClient.apiKey, orgId, id };
      } catch (e) {
        throw new Error(`Could not get guest profile at spinner api: ${(e as Error).message}`);
      }
    }
};
