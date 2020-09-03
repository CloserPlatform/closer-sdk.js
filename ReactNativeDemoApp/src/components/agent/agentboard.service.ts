import { useState, useEffect } from 'react';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SpinnerClient } from '@swagger/spinner';
import { protocol, Session } from '@closerplatform/closer-sdk';

import { Storage, StorageNames } from '../../storage';
import { SessionService } from '../../session.service';
import { Components } from '../types';

import { Props } from './agentboard';

export interface AgentContext {
  readonly id?: protocol.ID;
  readonly orgId?: protocol.ID;
  readonly roomId?: protocol.ID;
  readonly apiKey?: string;
}

type AgentBoardStateType = readonly [
  AgentContext | undefined,
  React.Dispatch<React.SetStateAction<AgentContext | undefined>>,
  Session | undefined,
  SpinnerClient | undefined,
  () => void,
  string | undefined,
  React.Dispatch<React.SetStateAction<string | undefined>>
];

export const AgentBoardState = ({ navigation, route }: Props): AgentBoardStateType => {
  const [roomId, setRoomId] = useState<string>();
  const [session, setSession] = useState<Session>();
  const [unsubscribeEvent] = useState(new Subject<void>());
  const [agentContext, setAgentContext] = useState<AgentContext>();
  const [spinnerClient, setSpinnerClient] = useState<SpinnerClient>();

  // tslint:disable: no-floating-promises
  useEffect(() => {
    const setup = async () => {
      try {
        const sc = new SpinnerClient(`${route.params.spinner}/api`);
        const loadedCtx = await loadContext();

        if (loadedCtx) {
          if (loadedCtx.apiKey) {
            sc.apiKey = loadedCtx.apiKey;
          }

          setRoomId(loadedCtx.roomId);
        }

        setSpinnerClient(sc);
        setAgentContext({ ...agentContext, ...loadedCtx });
      } catch (e) {
        navigation.navigate(Components.Error,
          { reason: `Error while loading saved credentials\n${(e as Error).message}` });
      }
    };

    setup();
  }, []);
  // tslint:enable: no-floating-promises

  useEffect(() => {
    if (agentContext && !session && spinnerClient && agentContext.apiKey && agentContext.id) {
      spinnerClient.apiKey = agentContext.apiKey;

      const s = SessionService.connect({ apiKey: agentContext.apiKey, id: agentContext.id },
        { artichoke: route.params.artichoke, spinner: route.params.spinner});

      setCallbacks(s);
      setSession(s);
    }

    return () => {
      unsubscribeEvent.next();
    };
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
      },
      err => console.error('Connection error', err),
      () => {
        console.log('Session disconnected');
      }
    );
  };

  const unsubscribe$ = (): Observable<void> => unsubscribeEvent.asObservable();

  const onRoomInputClick = async () => {
    if (roomId) {
      await Storage.saveAgent(StorageNames.RoomId, roomId);
      setAgentContext({ ...agentContext, roomId });
    }
  };

  return [agentContext, setAgentContext, session, spinnerClient, onRoomInputClick, roomId, setRoomId];
};

export const loadContext = async (): Promise<AgentContext | undefined> => {
  const isGuest = await Storage.getItem(StorageNames.IsGuest);

  if (isGuest === 'false') {
    const apiKey = await Storage.getItem(StorageNames.ApiKey);
    const orgId = await Storage.getItem(StorageNames.OrgId);
    const id =  await Storage.getItem(StorageNames.Id);
    const roomId = await Storage.getItem(StorageNames.RoomId);

    return { apiKey, orgId, id, roomId };
  }
  else {
    Storage.clearAll();
  }
};
