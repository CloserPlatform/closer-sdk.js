import { CloserSDK, UserConfig, Session } from '@closerplatform/closer-sdk';
import { ServerParams } from './components/types';

export interface AuthCtx {
  id: string;
  apiKey: string;
}

export class SessionService {
  public static connect = (authCtx: AuthCtx, servers: ServerParams): Session => {
    const { artichoke, spinner } = servers;

    console.log(`Connecting to ${artichoke} as: ${JSON.stringify(authCtx)}`);

    const userConfig: UserConfig = {
      logLevel: 0,
      spinner: { server: spinner },
      artichoke: { server: artichoke }
    };

    const session = CloserSDK.init(authCtx.id, authCtx.apiKey, userConfig);

    return session;
  }
}
