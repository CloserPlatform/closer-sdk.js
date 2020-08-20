import { HttpClient, HttpCodes } from '../../../src/http/http-client';
import { getLoggerServiceMock } from '../../mocks/logger.mock';
import { ApiHeaders } from '../../../src/http/api-headers';
import { getXMLHttpRequestFactory } from '../../mocks/http-client.mock';

const baseUrlString = 'http://localhost/';

const apiKey = 'apiKey';
const apiHeaders = new ApiHeaders(apiKey);
const deviceId = 'deviceId';
apiHeaders.deviceId = deviceId;

const getHttpClient = (
  xmlHttpRequestFactory = getXMLHttpRequestFactory(),
  headers = new ApiHeaders(apiKey),
  baseUrl: URL = new URL(baseUrlString),
): HttpClient =>
  new HttpClient(
    getLoggerServiceMock(),
    baseUrl,
    headers,
    xmlHttpRequestFactory,
  );

describe('HttpClient', () => {

  describe('setDeviceId', () => {
    it('get request', async () => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory);
      const mockedRequest = new XMLHttpRequest();

      spyOn(mockedRequest, 'open').and.callThrough();
      spyOn(mockedRequest, 'setRequestHeader');
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      const newDeviceId = 'xy';
      httpClient.setDeviceId(newDeviceId);
      await expectAsync(httpClient.get('/test')).toBeRejected();

      expect(xmlHttpRequestFactory.create).toHaveBeenCalled();
      expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.deviceIdKey, newDeviceId);
      expect(mockedRequest.open).toHaveBeenCalledWith('GET', `${baseUrlString}test`, true);
    });
  });

  describe('get', () => {
    it('get with headers - correct JSON format', done => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const testObject = {x: 123, y: { l1: 'a', l2: 'b'}};

      spyOn(mockedRequest, 'open');
      spyOn(mockedRequest, 'send');
      spyOnProperty(mockedRequest,  'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest,  'status', 'get').and.returnValue(HttpCodes.OK);
      spyOnProperty(mockedRequest,  'responseText', 'get').and.returnValue(JSON.stringify(testObject));
      spyOn(mockedRequest, 'setRequestHeader');
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      httpClient.get<typeof testObject>('/test')
        .then(res => {
          expect(xmlHttpRequestFactory.create).toHaveBeenCalled();
          expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.apiKeyKey, apiHeaders.apiKey);
          expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.deviceIdKey, apiHeaders.deviceId);
          expect(mockedRequest.open).toHaveBeenCalledWith('GET', `${baseUrlString}test`, true);
          expect(mockedRequest.send).toHaveBeenCalled();
          expect(res).toEqual(testObject);
          done();
        })
        .catch(done.fail);
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);
    });

    // FIXME this should be rejected
    it('get with headers - incorrect JSON format', done => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const invalidJSON = '{:!/';

      spyOnProperty(mockedRequest,  'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest,  'status', 'get').and.returnValue(HttpCodes.OK);
      spyOnProperty(mockedRequest,  'responseText', 'get').and.returnValue(invalidJSON);
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      httpClient.get<typeof invalidJSON>('/test')
        .then(res => {
          expect(res).toEqual(invalidJSON);
          done();
        })
        .catch(done.fail);
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);
    });

    // FIXME this maybe should be rejected
    it('get with headers - NoContent', done => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const responseNoContent = 'test';

      spyOnProperty(mockedRequest,  'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest,  'status', 'get').and.returnValue(HttpCodes.NoContent);
      spyOnProperty(mockedRequest,  'responseText', 'get').and.returnValue(responseNoContent);
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      httpClient.get<typeof responseNoContent>('/test')
        .then(res => {
          expect(res).toEqual(responseNoContent);
          done();
        })
        .catch(done.fail);
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);
    });

    it('get with headers - rejected', async () => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const errorJson = {code: 1, reason: 'z'};

      spyOnProperty(mockedRequest,  'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest,  'status', 'get').and.returnValue(HttpCodes.NotFound);
      spyOnProperty(mockedRequest,  'responseText', 'get').and.returnValue(JSON.stringify(errorJson));
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      const promise = httpClient.get<typeof errorJson>('/test');
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);

      await expectAsync(promise).toBeRejectedWith(errorJson);
    });

    it('get with headers - rejected - parse error', async () => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const invalidJsonError = '{:/';

      spyOnProperty(mockedRequest,  'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest,  'status', 'get').and.returnValue(HttpCodes.NotFound);
      spyOnProperty(mockedRequest,  'responseText', 'get').and.returnValue(invalidJsonError);
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      const promise = httpClient.get<typeof invalidJsonError>('/test');
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);

      await expectAsync(promise).toBeRejected();
    });
  });

  describe('delete', () => {
    it('delete with headers - correct JSON response - empty body', done => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const testObject = {x: 123, y: {l1: 'a', l2: 'b'}};

      spyOn(mockedRequest, 'open');
      spyOn(mockedRequest, 'send');
      spyOnProperty(mockedRequest, 'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest, 'status', 'get').and.returnValue(HttpCodes.OK);
      spyOnProperty(mockedRequest, 'responseText', 'get').and.returnValue(JSON.stringify(testObject));
      spyOn(mockedRequest, 'setRequestHeader');
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      httpClient.delete<typeof testObject>('/test')
        .then(res => {
          expect(xmlHttpRequestFactory.create).toHaveBeenCalled();
          expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.apiKeyKey, apiHeaders.apiKey);
          expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.deviceIdKey, apiHeaders.deviceId);
          expect(mockedRequest.open).toHaveBeenCalledWith('DELETE', `${baseUrlString}test`, true);
          expect(mockedRequest.send).toHaveBeenCalled();
          expect(res).toEqual(testObject);
          done();
        })
        .catch(done.fail);
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);
    });
  });

  describe('post', () => {
    it('post with headers - correct JSON response - body', done => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const testBody = {x: 123, y: {l1: 'a', l2: 'b'}};
      const testResponse = {q: {y: {a: 1, b: 'abc'}}};

      spyOn(mockedRequest, 'open');
      spyOn(mockedRequest, 'send');
      spyOnProperty(mockedRequest, 'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest, 'status', 'get').and.returnValue(HttpCodes.OK);
      spyOnProperty(mockedRequest, 'responseText', 'get').and.returnValue(JSON.stringify(testResponse));
      spyOn(mockedRequest, 'setRequestHeader');
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      httpClient.post<typeof testBody, typeof testResponse>('/test', testBody)
        .then(res => {
          expect(xmlHttpRequestFactory.create).toHaveBeenCalled();
          expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.apiKeyKey, apiHeaders.apiKey);
          expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.deviceIdKey, apiHeaders.deviceId);
          expect(mockedRequest.open).toHaveBeenCalledWith('POST', `${baseUrlString}test`, true);
          expect(mockedRequest.send).toHaveBeenCalled();
          expect(res).toEqual(testResponse);
          done();
        })
        .catch(done.fail);
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);
    });
  });

  describe('getPaginated', () => {
    it('correct json response, no pagination headers', async () => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const testObject = {x: 123, y: { l1: 'a', l2: 'b'}};
      const testArray: ReadonlyArray<typeof testObject> = [testObject];

      spyOn(mockedRequest, 'open');
      spyOn(mockedRequest, 'send');
      spyOnProperty(mockedRequest,  'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest,  'status', 'get').and.returnValue(HttpCodes.OK);
      spyOnProperty(mockedRequest,  'responseText', 'get').and.returnValue(JSON.stringify(testArray));
      spyOn(mockedRequest, 'setRequestHeader');
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      const promise = httpClient.getPaginated<typeof testObject>('/test')
        .then(res => {
          expect(xmlHttpRequestFactory.create).toHaveBeenCalled();
          expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.apiKeyKey, apiHeaders.apiKey);
          expect(mockedRequest.setRequestHeader).toHaveBeenCalledWith(ApiHeaders.deviceIdKey, apiHeaders.deviceId);
          expect(mockedRequest.open).toHaveBeenCalledWith('GET', `${baseUrlString}test`, true);
          expect(mockedRequest.send).toHaveBeenCalled();
          expect(res.items[0]).toEqual(testObject);
          expect(res.limit).toEqual(0);
          expect(res.offset).toEqual(0);
        });
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);
      await expectAsync(promise).toBeResolved();
    });

    it('correct json response with pagination headers', done => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const testObject = {x: 123, y: { l1: 'a', l2: 'b'}};
      const testArray: ReadonlyArray<typeof testObject> = [testObject, testObject];
      const offset = 10;
      const limit = 20;

      const getResponseHeaderMock = (headerName: string): string => {
        if (headerName === HttpClient.offsetHeaderName) {
          return String(offset);
        } else if (headerName === HttpClient.limitHeaderName) {
          return String(limit);
        } else {
          throw new Error('Wrong header');
        }
      };

      spyOn(mockedRequest, 'open');
      spyOn(mockedRequest, 'send');
      spyOnProperty(mockedRequest,  'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest,  'status', 'get').and.returnValue(HttpCodes.OK);
      spyOnProperty(mockedRequest,  'responseText', 'get').and.returnValue(JSON.stringify(testArray));
      spyOn(mockedRequest, 'setRequestHeader');
      spyOn(mockedRequest, 'getResponseHeader').and.callFake(getResponseHeaderMock);
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      httpClient.getPaginated<typeof testObject>('/test')
        .then(res => {
          expect(res.items).toEqual(testArray);
          expect(res.offset).toEqual(offset);
          expect(res.limit).toEqual(limit);
          done();
        })
        .catch(done.fail);
      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);
    });

    it('incorrect json response', async () => {
      const xmlHttpRequestFactory = getXMLHttpRequestFactory();
      const httpClient = getHttpClient(xmlHttpRequestFactory, apiHeaders);
      const mockedRequest = new XMLHttpRequest();
      const incorectJson = '{;/';

      spyOn(mockedRequest, 'open');
      spyOn(mockedRequest, 'send');
      spyOnProperty(mockedRequest,  'readyState', 'get').and.returnValue(XMLHttpRequest.DONE);
      spyOnProperty(mockedRequest,  'status', 'get').and.returnValue(HttpCodes.OK);
      spyOnProperty(mockedRequest,  'responseText', 'get').and.returnValue(incorectJson);
      spyOn(mockedRequest, 'setRequestHeader');
      spyOn(xmlHttpRequestFactory, 'create').and.returnValue(mockedRequest);

      const promise = httpClient.getPaginated('/test');

      // tslint:disable-next-line
      (mockedRequest as any).onreadystatechange({} as any);
      await expectAsync(promise).toBeRejected();
    });
  });
});
