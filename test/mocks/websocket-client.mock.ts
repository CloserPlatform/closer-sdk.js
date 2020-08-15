import { WebsocketClient } from '../../src/http/websocket-client';
import { getConfigMock } from './config.mock';
import { getUUIDGenerator } from '../unit/utils/uuid-generator.spec';
import { ArtichokeMessage } from '../../src/protocol/artichoke-message';
import { WebSocketSubject } from 'rxjs/webSocket';

const wssUrl = new URL(getConfigMock().artichoke.server);
wssUrl.protocol = 'wss:';

export const getSocket$Mock = (): WebSocketSubject<ArtichokeMessage> =>
  new WebSocketSubject<ArtichokeMessage>(wssUrl.href);

export const getWebsocketClientMock = (): WebsocketClient =>
  new WebsocketClient(
    getSocket$Mock(),
    getUUIDGenerator(),
    getConfigMock().artichoke.askTimeoutMs,
  );
