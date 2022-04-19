import { HeaderValue } from './header-value';
import { ApiKey, DeviceId, Fingerprint } from '../protocol/protocol';
import { ReconnectableWebSocket } from './reconnectable-websocket';

export class ApiHeaders {
  public static readonly apiKeyKey = 'X-Api-Key';
  public static readonly deviceIdKey = 'X-Device-Id';

  // tslint:disable-next-line:readonly-keyword
  public apiKey: ApiKey;
  // tslint:disable-next-line:readonly-keyword
  public fingerprint: Fingerprint | undefined;

  // tslint:disable-next-line:readonly-keyword
  private _deviceId: DeviceId;

  constructor(apiKey: ApiKey, options: AdditionalHeadersOptions = {}) {
    this.apiKey = apiKey;
    this.fingerprint = options.fingerprint;
  }

  public get deviceId(): DeviceId {
    return this._deviceId;
  }

  public set deviceId(value: DeviceId) {
    ReconnectableWebSocket.setDeviceId(this.apiKey, value);

    this._deviceId = value;
  }

  public getHeaders(): ReadonlyArray<HeaderValue> {
    return [
      new HeaderValue(ApiHeaders.apiKeyKey, this.apiKey),
      new HeaderValue(ApiHeaders.deviceIdKey, this._deviceId),
    ];
  }
}

export interface AdditionalHeadersOptions {
  readonly fingerprint?: Fingerprint;
}
