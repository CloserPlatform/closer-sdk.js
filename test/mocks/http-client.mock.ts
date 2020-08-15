import { HttpClient } from '../../src/http/http-client';
import { getLoggerServiceMock } from './logger.mock';
import { getConfigMock } from './config.mock';
import { ApiHeaders } from '../../src/http/api-headers';
import { XMLHttpRequestFactory } from '../../src/http/xml-http-request-factory';

export const getXMLHttpRequestFactory = (): XMLHttpRequestFactory =>
  new XMLHttpRequestFactory();

export const getHttpClientMock = (): HttpClient =>
  new HttpClient(
    getLoggerServiceMock(),
    new URL(getConfigMock().artichoke.server),
    new ApiHeaders(''),
    getXMLHttpRequestFactory(),
  );
