import { errorEvents } from '..';
import { HeaderValue } from './header-value';
import { PromiseReject, PromiseResolve } from '../utils/promise-utils';
import { LoggerService } from '../logger/logger-service';
import { Paginated } from '../protocol/protocol';
import { ApiHeaders } from './api-headers';
import { XMLHttpRequestFactory } from './xml-http-request-factory';

export enum HttpCodes {
  OK = 200,
  NoContent = 204,
  NotFound = 404,
}

export class HttpClient {

  public static readonly offsetHeaderName = 'X-Paging-Offset';
  public static readonly limitHeaderName = 'X-Paging-Limit';

  constructor(
    private logger: LoggerService,
    private baseUrl: URL,
    private apiHeaders: ApiHeaders,
    private xmlHttpRequestFactory: XMLHttpRequestFactory,
  ) {
  }

  public setDeviceId(deviceId: string): void {
    this.apiHeaders.deviceId = deviceId;
  }

  public async get<Response>(path: string): Promise<Response> {
    return this.getRaw(path, this.apiHeaders.getHeaders()).then(resp => this.parseData<Response>(resp));
  }

  public async post<Body, Response>(path: string, body?: Body): Promise<Response> {
    return this.postRaw(path, this.apiHeaders.getHeaders(), body).then(resp => this.parseData<Response>(resp));
  }

  public async delete<Response>(path: string): Promise<Response> {
    return this.deleteRaw(path, this.apiHeaders.getHeaders()).then(resp => this.parseData<Response>(resp));
  }

  public async getPaginated<Item>(path: string): Promise<Paginated<Item>> {
    return this.getRaw(path, this.apiHeaders.getHeaders())
      .then(resp => {
        try {
          const items = JSON.parse(resp.responseText) as ReadonlyArray<Item>;
          const offset = parseInt(resp.getResponseHeader(HttpClient.offsetHeaderName) || '0', 10);
          const limit = parseInt(resp.getResponseHeader(HttpClient.limitHeaderName) || '0', 10);

          return {
            items,
            offset,
            limit
          };
        } catch (err) {
          this.logger.debug(
            `Api - getPaginated: Cannot parse response: ${err}\n Tried to parse:  ${resp.responseText}`);
          throw new Error('Api - getPaginated: Cannot parse response');
        }
      });
  }

  private async getRaw(path: string, headers: ReadonlyArray<HeaderValue>): Promise<XMLHttpRequest> {
    return new Promise<XMLHttpRequest>((resolve, reject): void => {
      const url = this.getPathWithBaseUrl(path);
      this.logger.debug(`GET ${url}`);

      const xhttp = this.xmlHttpRequestFactory.create();
      xhttp.onreadystatechange = this.responseCallback(xhttp, resolve, reject);
      xhttp.open('GET', url.href, true);
      headers.forEach((h) => xhttp.setRequestHeader(h.header, h.value));
      xhttp.send();
    });
  }

  private async deleteRaw<Body>(path: string,
                          headers: ReadonlyArray<HeaderValue>, body?: Body): Promise<XMLHttpRequest> {
    return this.httpRequestWithBody('DELETE')(path, headers, body);
  }

  private async postRaw<Body>(path: string,
                        headers: ReadonlyArray<HeaderValue>, body?: Body): Promise<XMLHttpRequest> {
    return this.httpRequestWithBody('POST')(path, headers, body);
  }

  private httpRequestWithBody(method: 'POST' | 'DELETE'): <Body>(path: string,
                                                                 headers: ReadonlyArray<HeaderValue>,
                                                                 body?: Body) => Promise<XMLHttpRequest> {
    return async <Body>(path: string, headers: ReadonlyArray<HeaderValue>,
                  body?: Body): Promise<XMLHttpRequest> =>
      new Promise<XMLHttpRequest>((resolve, reject): void => {

        const xhttp = this.xmlHttpRequestFactory.create();
        const url = this.getPathWithBaseUrl(path);
        xhttp.onreadystatechange = this.responseCallback(xhttp, resolve, reject);
        xhttp.open(method, url.href, true);
        headers.forEach((h) => xhttp.setRequestHeader(h.header, h.value));

        if (body) {
          const json = JSON.stringify(body);
          this.logger.debug(`${method + url.href}: ${json}`);
          xhttp.setRequestHeader('Content-Type', 'application/json');
          xhttp.send(json);
        } else {
          this.logger.debug(method + url.href);
          xhttp.send();
        }
      });
  }

  private responseCallback(xhttp: XMLHttpRequest,
                           resolve: PromiseResolve<XMLHttpRequest>,
                           reject: PromiseReject): () => void {
    return (): void => {
      if (xhttp.readyState === XMLHttpRequest.DONE &&
        (xhttp.status === HttpCodes.OK || xhttp.status === HttpCodes.NoContent)) {
        this.logger.debug(`OK response: ${xhttp.responseText}`);
        resolve(xhttp);
      } else if (xhttp.readyState === XMLHttpRequest.DONE) {
        this.logger.debug(`Api - responseCallback: Error response: ${xhttp.responseText}`);
        try {
          const responseError = JSON.parse(xhttp.responseText);
          // tslint:disable-next-line:no-unsafe-any
          reject(responseError);
        } catch (err) {
          this.logger.debug(`Api - responseCallback: Cannot parse error response: ${err}
 Tried to parse: ${xhttp.responseText}`);
          // FIXME
          // tslint:disable-next-line:no-any
          reject((`Cannot parse Error response: ${err} \nError response: ${xhttp.responseText}`) as any);
        }
      }

      xhttp.onerror = (err): void => {
        reject(new errorEvents.Error(`XMLHttpRequest status: ${xhttp.status} ${err}`));
      };
    };
  }

  private parseData<T>(resp: XMLHttpRequest): T {
    if (resp.status === HttpCodes.NoContent) {
      // FIXME
      // tslint:disable-next-line:no-any
      return resp.responseText as any as T;
    }
    try {
      // tslint:disable-next-line:no-unsafe-any
      return JSON.parse(resp.responseText);
    } catch (err) {
      this.logger.debug(`Api - parseData: Cannot parse response: ${err}\nTried to parse: ${resp.responseText}`);

      // FIXME
      // tslint:disable-next-line:no-any
      return resp.responseText as any as T;
    }
  }

  private getPathWithBaseUrl(path: string): URL {
    return new URL(path, this.baseUrl);
  }

}
