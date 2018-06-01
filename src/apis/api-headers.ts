import { HeaderValue } from './header-value';
import { ApiKey } from '../auth/auth';
import * as proto from '../protocol/protocol';

export class ApiHeaders {

  private readonly deviceIdKey = 'X-Device-Id';
  private readonly apiKeyKey = 'X-Api-Key';

  private _deviceId: proto.ID;
  private _apiKey: ApiKey;

  get deviceId(): proto.ID {
    return this._deviceId;
  }

  set deviceId(value: proto.ID) {
    this._deviceId = value;
  }

  get apiKey(): ApiKey {
    return this._apiKey;
  }

  set apiKey(value: ApiKey) {
    this._apiKey = value;
  }

  public getHeaders = (): HeaderValue[] =>
    [new HeaderValue(this.apiKeyKey, this._apiKey), new HeaderValue(this.deviceIdKey, this._deviceId)]
}
