import { HeaderValue } from './header-value';
import { ApiKey, DeviceId } from '../protocol/protocol';
import { ReconnectableWebSocket } from './reconnectable-websocket';

export class ApiHeaders {
  public static readonly apiKeyKey = 'X-Api-Key';
  public static readonly deviceIdKey = 'X-Device-Id';

  // tslint:disable-next-line:readonly-keyword
  private _deviceId: DeviceId;
  // tslint:disable-next-line:readonly-keyword
  private _apiKey: ApiKey;

  constructor(apiKey: ApiKey) {
    this._apiKey = apiKey;
  }

  public get deviceId(): DeviceId {
    return this._deviceId;
  }

  public set deviceId(value: DeviceId) {
    ReconnectableWebSocket.setDeviceId(this.apiKey, value);

    this._deviceId = value;
  }

  public get apiKey(): ApiKey {
    return this._apiKey;
  }

  public getHeaders(): ReadonlyArray<HeaderValue> {
    return [
      new HeaderValue(ApiHeaders.apiKeyKey, this._apiKey),
      new HeaderValue(ApiHeaders.deviceIdKey, this._deviceId)
    ];
  }
}
