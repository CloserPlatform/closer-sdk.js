import { ArtichokeApi } from '../../src/artichoke/artichoke-api';
import { getHttpClientMock } from './http-client.mock';
import { getWebsocketClientMock } from './websocket-client.mock';

export const getArtichokeApiMock = (sessionId = 'sessionId'): ArtichokeApi =>
  new ArtichokeApi(
    sessionId,
    getWebsocketClientMock(),
    getHttpClientMock(),
  );
