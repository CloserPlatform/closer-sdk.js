import { ApiKey, DeviceId } from '../protocol/protocol';

export class ReconnectableWebSocket extends WebSocket {

    public static readonly deviceIdMap = new Map<ApiKey, DeviceId>();

    // tslint:disable-next-line:readonly-array
    constructor(url: string, protocols?: string | string[]) {

      const apiKey = url.split('/').slice(-1)[0];
      const maybeDeviceId = ReconnectableWebSocket.deviceIdMap.get(apiKey);
      const wsUrl = maybeDeviceId ? `${url}/reconnect/${maybeDeviceId}` : url;

      super(wsUrl, protocols);
    }

    public static setDeviceId(apiKey: ApiKey, deviceId: DeviceId): void {
      ReconnectableWebSocket.deviceIdMap.set(apiKey, deviceId);
    }
}
