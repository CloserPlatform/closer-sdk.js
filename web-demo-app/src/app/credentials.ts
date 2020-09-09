import { Logger } from './logger';
import { ID } from '../../../dist/protocol/protocol';

export interface Servers {
  readonly artichoke: string;
  readonly spinner: string;
}

export interface SessionDetails {
  readonly apiKey: ID;
  readonly id: ID;
  readonly isGuest: true;
}

interface BrowserData {
  readonly servers?: Servers;
  readonly session?: SessionDetails;
  readonly orgId?: ID;
  readonly roomId?: ID;
}

export class Credentials {
  private static readonly storageName = 'crdls';

  public getOrgId(): ID | undefined {
    return this.getBrowserData().roomId;
  }

  public setOrgId(orgId: ID): void {
    return this.saveBrowserData({orgId});
  }

  public getRoomId(): ID | undefined {
    return this.getBrowserData().roomId;
  }

  public setRoomId(roomId: ID): void {
    return this.saveBrowserData({roomId});
  }

  public getSession(): SessionDetails | undefined {
    return this.getBrowserData().session;
  }

  public setSession(session: SessionDetails): void {
    return this.saveBrowserData({session});
  }

  public getServers(): Servers | undefined {
    return this.getBrowserData().servers;
  }

  public setServers(servers: Servers): void {
    return this.saveBrowserData({servers});
  }

  public clear(): void {
    return localStorage.removeItem(Credentials.storageName);
  }

  private saveBrowserData(browserData: BrowserData): void {
    return localStorage.setItem(Credentials.storageName,
      JSON.stringify({
        ...this.getBrowserData(),
        ...browserData
      }));
  }

  private getBrowserData(): BrowserData {
    const json = localStorage.getItem(Credentials.storageName);
    try {
      if (json) {
        return JSON.parse(json) as BrowserData;
      }
    } catch (e) {
      Logger.error('Could not parse storage json object', e);

      return {};
    }

    return {};
  }
}
