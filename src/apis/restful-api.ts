import { errorEvents } from '../protocol/events/error-events';
import { Logger } from '../logger';
import { HeaderValue } from './header-value';
import { PromiseReject, PromiseResolve } from '../utils/promise-utils';

export class RESTfulAPI {

  public postRaw: <Body>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body) => Promise<XMLHttpRequest> =
    this.httpRequestWithBody('POST');

  public deleteRaw: <Body>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body) => Promise<XMLHttpRequest> =
    this.httpRequestWithBody('DELETE');

  constructor(protected log: Logger) {
  }

  public getRaw<Response>(path: Array<string>, headers?: Array<HeaderValue>): Promise<XMLHttpRequest> {
    return new Promise<XMLHttpRequest>((resolve, reject): void => {
      const url = path.join('/');
      this.log.debug('GET ' + url);

      const xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = this.responseCallback(xhttp, resolve, reject);
      xhttp.open('GET', url, true);
      (headers || []).forEach((h) => xhttp.setRequestHeader(h.header, h.value));
      xhttp.send();
    });
  }

  public get<Response>(path: Array<string>, headers?: Array<HeaderValue>): Promise<Response> {
    return this.getRaw(path, headers).then((resp) => this.parseData<Response>(resp));
  }

  public post<Body, Response>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body): Promise<Response> {
    return this.postRaw(path, headers, body).then((resp) => this.parseData<Response>(resp));
  }

  public delete<Body, Response>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body): Promise<Response> {
    return this.deleteRaw(path, headers, body).then((resp) => this.parseData<Response>(resp));
  }

  private responseCallback(xhttp: XMLHttpRequest,
                           resolve: PromiseResolve<XMLHttpRequest>,
                           reject: PromiseReject): () => void {
    return (): void => {
      if (xhttp.readyState === 4 && (xhttp.status === 200 || xhttp.status === 204)) {
        this.log.debug('OK response: ' + xhttp.responseText);
        resolve(xhttp);
      } else if (xhttp.readyState === 4) {
        this.log.debug('Api - responseCallback: Error response: ' + xhttp.responseText);
        try {
          const responseError = JSON.parse(xhttp.responseText);
          reject(responseError);
        } catch (err) {
          this.log.debug('Api - responseCallback: Cannot parse error response: ' + err +
            '\n Tried to parse: ' + xhttp.responseText);
          // FIXME
          // tslint:disable-next-line:no-any
          reject(('Cannot parse Error response: ' + err + '\nError response: ' + xhttp.responseText) as any);
        }
      }

      xhttp.onerror = (err): void => {
        reject(new errorEvents.Error('XMLHttpRequest status: ' + xhttp.status + ' ' + err));
      };
    };
  }

  private httpRequestWithBody(method: 'POST' | 'DELETE'):
  <Body>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body) => Promise<XMLHttpRequest> {
    return <Body>(path: Array<string>, headers?: Array<HeaderValue>, body?: Body): Promise<XMLHttpRequest> =>
      new Promise<XMLHttpRequest>((resolve, reject): void => {
        const url = path.join('/');

        const xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = this.responseCallback(xhttp, resolve, reject);
        xhttp.open(method, url, true);
        (headers || []).forEach((h) => xhttp.setRequestHeader(h.header, h.value));

        if (body) {
          const json = JSON.stringify(body);
          this.log.debug(method + url + ': ' + json);
          xhttp.setRequestHeader('Content-Type', 'application/json');
          xhttp.send(json);
        } else {
          this.log.debug(method + url);
          xhttp.send();
        }
      });
  }

  private parseData<T>(resp: XMLHttpRequest): T {
    if (resp.status === 204) {
      // FIXME
      // tslint:disable-next-line:no-any
      return resp.responseText as any as T;
    }
    try {
      return JSON.parse(resp.responseText);
    } catch (err) {
      this.log.debug('Api - parseData: Cannot parse response: ' + err + '\n Tried to parse: ' + resp.responseText);

      // FIXME
      // tslint:disable-next-line:no-any
      return resp.responseText as any as T;
    }
  }

}
