import { HeaderValue } from './header-value';
import { ApiKey } from '../auth/auth';
import * as proto from '../protocol/protocol';

export class ApiHeaders {

  private readonly deviceIdKey = 'X-Device-Id';
  private readonly apiKeyKey = 'X-Api-Key';

  private _deviceId: proto.ID;
  private _apiKey: ApiKey;

  public get deviceId(): proto.ID {
    return this._deviceId;
  }

  public set deviceId(value: proto.ID) {
    this._deviceId = value;
  }

  public get apiKey(): ApiKey {
    return this._apiKey;
  }

  public set apiKey(value: ApiKey) {
    this._apiKey = value;
  }

  public getHeaders = (): ReadonlyArray<HeaderValue> =>
    [new HeaderValue(this.apiKeyKey, this._apiKey), new HeaderValue(this.deviceIdKey, this._deviceId)]
}
